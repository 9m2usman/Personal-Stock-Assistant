"""
Market Data API Routes
Provides quotes, historical candlestick bars, and computed technical indicators.
"""
from typing import List, Optional
from fastapi import APIRouter, Query, status, HTTPException
from src.backend.services.market_service import market_service, MarketSummary
from src.backend.services.technical_service import ChartReadyTechnicalPayload
from src.backend.data_ingestion.base import NormalizedQuote, NormalizedBar

router = APIRouter()

@router.get("/quote", response_model=NormalizedQuote, status_code=status.HTTP_200_OK, summary="Get Real-Time / Latest Quote")
async def get_quote(
    symbol: str = Query(..., description="Ticker symbol (e.g. NVDA, AAPL, HSBA.L, 7203.T)")
):
    """Retrieve normalized real-time quote for a given instrument."""
    return await market_service.get_realtime_quote(symbol)

@router.get("/history", response_model=List[NormalizedBar], status_code=status.HTTP_200_OK, summary="Get Historical Bars")
async def get_history(
    symbol: str = Query(..., description="Ticker symbol"),
    limit: int = Query(default=100, ge=1, le=500, description="Number of bars to return (default 100, max 500)")
):
    """Retrieve historical daily candlestick bars."""
    return await market_service.get_historical_bars(symbol, limit=limit)

@router.get("/technicals", response_model=ChartReadyTechnicalPayload, status_code=status.HTTP_200_OK, summary="Get Technical Analysis & Chart Data")
async def get_technicals(
    symbol: str = Query(..., description="Ticker symbol"),
    limit: int = Query(default=100, ge=1, le=500, description="Number of historical periods to include for calculation")
):
    """Retrieve historical candlesticks and quantitative indicators (SMA, EMA, RSI, MACD, Bollinger Bands)."""
    return await market_service.get_technicals(symbol, limit=limit)

@router.get("/summary", response_model=MarketSummary, status_code=status.HTTP_200_OK, summary="Get Market Overview Summary")
async def get_market_summary(
    symbol: str = Query(..., description="Ticker symbol")
):
    """Retrieve combined overview containing quote, key technicals, and bar count."""
    return await market_service.get_market_summary(symbol)
