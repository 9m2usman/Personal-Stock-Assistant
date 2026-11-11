"""
Unit Tests for Financial News & Sentiment Analysis Service
Verifies lexicon scoring, polarity labeling, and sentiment overview aggregation.
"""
import pytest
from datetime import datetime, timezone
from src.backend.services.news_service import FinancialNewsService, news_service
from src.backend.data_ingestion.base import NormalizedNewsArticle

def test_score_article_sentiment():
    # Bullish text
    score, label = news_service.score_article_sentiment("NVIDIA surges on record revenue growth and beats earnings expectations")
    assert score > 0.15
    assert label == "POSITIVE"

    # Bearish text
    score, label = news_service.score_article_sentiment("Company faces lawsuit, slump in sales, and severe profit decline warning")
    assert score < -0.15
    assert label == "NEGATIVE"

    # Neutral text
    score, label = news_service.score_article_sentiment("Company announces annual general meeting schedule for shareholders")
    assert label == "NEUTRAL"

@pytest.mark.asyncio
async def test_get_company_sentiment_aggregate():
    class MockRouter:
        async def search_news(self, query: str, limit: int = 10):
            now = datetime.now(timezone.utc)
            return [
                NormalizedNewsArticle(
                    title="NVIDIA beats revenue estimates with record surge",
                    source="Reuters",
                    url="https://example.com/1",
                    published_at=now,
                    provider="mock"
                ),
                NormalizedNewsArticle(
                    title="Analyst upgrades NVIDIA with bullish target",
                    source="Bloomberg",
                    url="https://example.com/2",
                    published_at=now,
                    provider="mock"
                ),
                NormalizedNewsArticle(
                    title="Tech sector quarterly review published",
                    source="WSJ",
                    url="https://example.com/3",
                    published_at=now,
                    provider="mock"
                )
            ]

    svc = FinancialNewsService(router=MockRouter())
    overview = await svc.get_company_sentiment("NVDA")

    assert overview.symbol == "NVDA"
    assert overview.total_articles == 3
    assert overview.breakdown.positive == 2
    assert overview.breakdown.neutral == 1
    assert overview.breakdown.negative == 0
    assert overview.sentiment_label == "BULLISH"
    assert overview.average_sentiment_score > 0
