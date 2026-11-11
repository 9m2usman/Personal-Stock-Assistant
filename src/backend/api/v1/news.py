"""
Financial News & Sentiment API Routes
Provides keyword searches, article listings, and aggregated sentiment scores.
"""
from typing import List
from fastapi import APIRouter, Query, status
from src.backend.services.news_service import news_service, CompanySentimentOverview
from src.backend.data_ingestion.base import NormalizedNewsArticle

router = APIRouter()

@router.get("/search", response_model=List[NormalizedNewsArticle], status_code=status.HTTP_200_OK, summary="Search Financial News")
async def search_news(
    query: str = Query(..., description="Company name, ticker, or topic"),
    limit: int = Query(default=10, ge=1, le=25, description="Number of articles to retrieve")
):
    """Retrieve financial news articles with enriched sentiment classification."""
    return await news_service.get_articles_for_symbol(query, limit=limit)

@router.get("/sentiment", response_model=CompanySentimentOverview, status_code=status.HTTP_200_OK, summary="Get Company Sentiment Overview")
async def get_sentiment(
    symbol: str = Query(..., description="Ticker symbol or enterprise name"),
    limit: int = Query(default=10, ge=1, le=25, description="Number of recent articles to sample")
):
    """Compute aggregate bullish/bearish polarity score and breakdown."""
    return await news_service.get_company_sentiment(symbol, limit=limit)
