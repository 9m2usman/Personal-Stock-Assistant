"""
NewsAPI Provider Implementation (Development Mode)
"""
import httpx
from typing import List
from datetime import datetime
from src.backend.data_ingestion.base import BaseNewsProvider, NormalizedNewsArticle
from src.backend.data_ingestion.rate_limiter import rate_limiters
from src.backend.data_ingestion.cache_manager import cache
from src.backend.core.config import settings
from src.backend.core.logging import logger
from src.backend.core.exceptions import ProviderRateLimitError

class NewsAPIClient(BaseNewsProvider):
    """Integrates NewsAPI v2 for financial news search during local development."""
    def __init__(self):
        self.api_key = settings.NEWSAPI_API_KEY.get_secret_value() if settings.NEWSAPI_API_KEY else ""
        self.base_url = "https://newsapi.org/v2"
        self.timeout = 15.0

    @property
    def provider_name(self) -> str:
        return "newsapi"

    async def search_news(self, query: str, limit: int = 5) -> List[NormalizedNewsArticle]:
        cache_key = f"news_{query}_{limit}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        await rate_limiters["newsapi"].acquire()
        params = {
            "q": query,
            "sortBy": "publishedAt",
            "pageSize": limit,
            "apiKey": self.api_key
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(f"{self.base_url}/everything", params=params)
            except Exception as e:
                logger.error("NewsAPI network error: %s", e)
                return []

            if resp.status_code == 429:
                raise ProviderRateLimitError("newsapi", retry_after_sec=3600)

            data = resp.json()
            articles = data.get("articles", [])
            normalized: List[NormalizedNewsArticle] = []

            for art in articles:
                title = art.get("title", "")
                # Simple sentiment heuristic for prototype classification
                sentiment = "NEUTRAL"
                lower_title = title.lower()
                if any(w in lower_title for w in ["soars", "jumps", "beats", "record", "growth", "bullish", "profit"]):
                    sentiment = "POSITIVE"
                elif any(w in lower_title for w in ["plunges", "drops", "slumps", "cuts", "loss", "bearish", "falls"]):
                    sentiment = "NEGATIVE"

                normalized.append(NormalizedNewsArticle(
                    title=title,
                    source=art.get("source", {}).get("name", "Unknown Publisher"),
                    url=art.get("url", ""),
                    published_at=datetime.fromisoformat(art["publishedAt"].replace("Z", "+00:00")),
                    summary=art.get("description"),
                    sentiment_label=sentiment,
                    provider=self.provider_name
                ))

            cache.set(cache_key, normalized, ttl_seconds=1800)  # Cache news for 30 minutes
            return normalized
