"""
Financial News Ingestion & Sentiment Scoring Service
Integrates NewsAPI, performs heuristic financial sentiment scoring, and generates sentiment dossiers.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from src.backend.data_ingestion.router import financial_router, FinancialDataRouter
from src.backend.data_ingestion.base import NormalizedNewsArticle
from src.backend.core.logging import logger

class SentimentBreakdown(BaseModel):
    positive: int = 0
    neutral: int = 0
    negative: int = 0

class CompanySentimentOverview(BaseModel):
    symbol: str
    total_articles: int
    average_sentiment_score: float  # -1.0 to +1.0
    sentiment_label: str            # BULLISH / POSITIVE, NEUTRAL, BEARISH / NEGATIVE
    breakdown: SentimentBreakdown
    articles: List[NormalizedNewsArticle]

class FinancialNewsService:
    """Evaluates financial news streams and derives domain-specific sentiment polarity."""

    POSITIVE_LEXICON = {
        "surge", "rally", "growth", "beat", "bullish", "record", "dividend", "upgrade",
        "profit", "outperform", "soar", "gain", "expansion", "high", "success", "innovative",
        "partnership", "breakthrough", "exceeded", "strong"
    }

    NEGATIVE_LEXICON = {
        "plunge", "slump", "miss", "loss", "bearish", "lawsuit", "downgrade", "investigation",
        "crisis", "decline", "fall", "warning", "layoffs", "fine", "fraud", "scandal",
        "underperform", "drop", "cut", "inflation", "weak"
    }

    def __init__(self, router: FinancialDataRouter = financial_router):
        self.router = router

    def score_article_sentiment(self, text: str) -> tuple[float, str]:
        """Calculates normalized sentiment score in [-1.0, 1.0] and categorizes polarity."""
        tokens = text.lower().split()
        pos_count = sum(1 for t in tokens if any(pos in t for pos in self.POSITIVE_LEXICON))
        neg_count = sum(1 for t in tokens if any(neg in t for neg in self.NEGATIVE_LEXICON))

        total = pos_count + neg_count
        if total == 0:
            return 0.0, "NEUTRAL"

        score = (pos_count - neg_count) / float(total)

        if score > 0.15:
            label = "POSITIVE"
        elif score < -0.15:
            label = "NEGATIVE"
        else:
            label = "NEUTRAL"

        return round(score, 2), label

    async def get_articles_for_symbol(self, query: str, limit: int = 10) -> List[NormalizedNewsArticle]:
        """Fetches and enriches articles with calculated sentiment labels."""
        raw_articles = await self.router.search_news(query, limit=limit)
        enriched: List[NormalizedNewsArticle] = []

        for a in raw_articles:
            full_text = f"{a.title} {a.summary or ''}"
            score, label = self.score_article_sentiment(full_text)
            enriched.append(NormalizedNewsArticle(
                title=a.title,
                source=a.source,
                url=a.url,
                published_at=a.published_at,
                summary=a.summary,
                sentiment_label=label,
                provider=a.provider
            ))
        return enriched

    async def get_company_sentiment(self, symbol: str, limit: int = 10) -> CompanySentimentOverview:
        """Computes aggregate sentiment dossier for a company."""
        articles = await self.get_articles_for_symbol(symbol, limit=limit)

        if not articles:
            return CompanySentimentOverview(
                symbol=symbol.upper(),
                total_articles=0,
                average_sentiment_score=0.0,
                sentiment_label="NEUTRAL",
                breakdown=SentimentBreakdown(),
                articles=[]
            )

        pos_count = sum(1 for a in articles if a.sentiment_label == "POSITIVE")
        neg_count = sum(1 for a in articles if a.sentiment_label == "NEGATIVE")
        neu_count = sum(1 for a in articles if a.sentiment_label == "NEUTRAL")

        total = len(articles)
        avg_score = (pos_count - neg_count) / float(total)

        if avg_score > 0.15:
            overall_label = "BULLISH"
        elif avg_score < -0.15:
            overall_label = "BEARISH"
        else:
            overall_label = "NEUTRAL"

        return CompanySentimentOverview(
            symbol=symbol.upper(),
            total_articles=total,
            average_sentiment_score=round(avg_score, 2),
            sentiment_label=overall_label,
            breakdown=SentimentBreakdown(positive=pos_count, neutral=neu_count, negative=neg_count),
            articles=articles
        )

news_service = FinancialNewsService()
