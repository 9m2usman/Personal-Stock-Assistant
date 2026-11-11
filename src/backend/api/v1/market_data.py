"""
Market Data API Routes
Provides quotes, historical candlestick bars, computed technical indicators,
and institutional global instrument catalog discovery.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, status, HTTPException
from src.backend.services.market_service import market_service, MarketSummary
from src.backend.services.technical_service import ChartReadyTechnicalPayload
from src.backend.services.instrument_service import instrument_service
from src.backend.services.catalog_sync_service import catalog_sync_service
from src.backend.data_ingestion.base import NormalizedQuote, NormalizedBar, NormalizedInstrument

router = APIRouter()

@router.get("/search", response_model=List[NormalizedInstrument], status_code=status.HTTP_200_OK, summary="Unified Instrument Search")
async def search_instruments(
    query: str = Query(default="", description="Search query: company name, ticker, exchange, country"),
    exchange: Optional[str] = Query(default=None, description="Filter by exchange code or MIC (e.g. NASDAQ, XLON, XJPX)"),
    country: Optional[str] = Query(default=None, description="Filter by country (e.g. United States, United Kingdom, Japan, Switzerland)"),
    asset_type: Optional[str] = Query(default=None, description="Filter by asset type (e.g. Common Stock, ADR, ETF)"),
    sector: Optional[str] = Query(default=None, description="Filter by sector"),
    limit: int = Query(default=20, ge=1, le=100, description="Max results to return"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination")
):
    """Searches normalized instruments across global exchanges and returns matches."""
    return await instrument_service.search(
        query=query,
        exchange=exchange,
        country=country,
        asset_type=asset_type,
        sector=sector,
        limit=limit,
        offset=offset
    )

@router.get("/instruments/paginated", status_code=status.HTTP_200_OK, summary="Paginated Global Instrument Catalogue")
async def list_instruments_paginated(
    query: str = Query(default="", description="Search query"),
    exchange: Optional[str] = Query(default=None, description="Filter by exchange code or MIC"),
    country: Optional[str] = Query(default=None, description="Filter by country"),
    asset_type: Optional[str] = Query(default=None, description="Filter by asset type"),
    sector: Optional[str] = Query(default=None, description="Filter by sector"),
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Page size")
):
    """Returns paginated global instruments with full filter support and total counts."""
    return await instrument_service.search_paginated(
        query=query,
        exchange=exchange,
        country=country,
        asset_type=asset_type,
        sector=sector,
        page=page,
        page_size=page_size
    )

@router.get("/instruments", response_model=List[NormalizedInstrument], status_code=status.HTTP_200_OK, summary="List Supported Instruments")
async def list_instruments(
    limit: int = Query(default=50, ge=1, le=100, description="Max results to return")
):
    """Returns all canonically registered and resolved instruments."""
    return await instrument_service.search(query="", limit=limit)

@router.get("/instruments/stats", status_code=status.HTTP_200_OK, summary="Catalogue Coverage Statistics")
async def get_catalogue_stats():
    """Returns real verified statistics of the global instrument catalog."""
    return await catalog_sync_service.get_catalogue_statistics()

@router.post("/instruments/sync", status_code=status.HTTP_200_OK, summary="Synchronize Global Instrument Catalogue")
async def sync_instruments(
    source: str = Query(default="curated", description="Source to sync: 'curated' or 'sec_edgar'")
):
    """Triggers catalog synchronization from curated universe or official SEC EDGAR registry."""
    if source == "sec_edgar":
        count = await catalog_sync_service.sync_sec_edgar_tickers(max_records=2500)
    else:
        count = await catalog_sync_service.sync_curated_universe()

    stats = await catalog_sync_service.get_catalogue_statistics()
    return {
        "status": "SUCCESS",
        "new_instruments_ingested": count,
        "catalogue_statistics": stats
    }

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
