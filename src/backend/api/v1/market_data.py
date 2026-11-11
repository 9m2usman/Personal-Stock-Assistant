"""
Market Data API Routes
Provides quotes, historical candlestick bars, and computed technical indicators.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, status, HTTPException
from src.backend.services.market_service import market_service, MarketSummary
from src.backend.services.technical_service import ChartReadyTechnicalPayload
from src.backend.services.instrument_service import instrument_service
from src.backend.data_ingestion.base import NormalizedQuote, NormalizedBar, NormalizedInstrument

router = APIRouter()

@router.get("/search", response_model=List[NormalizedInstrument], status_code=status.HTTP_200_OK, summary="Unified Instrument Search")
async def search_instruments(
    query: str = Query(default="", description="Search query: company name, ticker, exchange, country"),
    exchange: Optional[str] = Query(default=None, description="Filter by exchange code or MIC (e.g. NASDAQ, XLON, XJPX)"),
    limit: int = Query(default=15, ge=1, le=50, description="Max results to return")
):
    """Searches normalized instruments across global exchanges and returns matches."""
    return await instrument_service.search(query=query, exchange=exchange, limit=limit)

@router.get("/instruments", response_model=List[NormalizedInstrument], status_code=status.HTTP_200_OK, summary="List Supported Instruments")
async def list_instruments():
    """Returns all canonically registered and resolved instruments."""
    return await instrument_service.search(query="", limit=50)

@router.get("/watchlist", response_model=List[Dict[str, Any]], status_code=status.HTTP_200_OK, summary="Get Multi-Stock Watchlist")
async def get_watchlist():
    """Retrieve diversified watchlist of instruments with live quotes and data freshness."""
    return await instrument_service.get_watchlist()


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
