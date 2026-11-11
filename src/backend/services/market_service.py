"""
Market Data Service
Coordinates financial data routing, technical analysis, and price aggregation.
"""
from typing import List, Optional, Dict, Any
from decimal import Decimal
from pydantic import BaseModel
from src.backend.data_ingestion.router import financial_router, FinancialDataRouter
from src.backend.data_ingestion.base import NormalizedBar, NormalizedQuote
from src.backend.services.technical_service import technical_service, ChartReadyTechnicalPayload, TechnicalIndicators
from src.backend.core.logging import logger

class MarketSummary(BaseModel):
    symbol: str
    quote: NormalizedQuote
    technical_indicators: Optional[TechnicalIndicators] = None
    historical_bars_count: int = 0

class MarketDataService:
    """Service orchestrating market data ingestion and quantitative metrics."""

    def __init__(self, router: FinancialDataRouter = financial_router):
        self.router = router

    async def get_realtime_quote(self, symbol: str) -> NormalizedQuote:
        """Fetches normalized real-time / latest quote."""
        return await self.router.get_quote(symbol)

    async def get_historical_bars(self, symbol: str, limit: int = 100) -> List[NormalizedBar]:
        """Fetches historical EOD bars chronologically."""
        bars = await self.router.get_daily_history(symbol, limit=limit)
        # Sort chronologically (oldest first)
        return sorted(bars, key=lambda b: b.trade_date)

    async def get_technicals(self, symbol: str, limit: int = 100) -> ChartReadyTechnicalPayload:
        """Fetches historical bars and computes technical indicators formatted for charts."""
        bars = await self.get_historical_bars(symbol, limit=limit)
        return technical_service.process_bars(symbol, bars)

    async def get_market_summary(self, symbol: str) -> MarketSummary:
        """Provides comprehensive market overview combining quote and key technicals."""
        quote = await self.get_realtime_quote(symbol)
        try:
            bars = await self.get_historical_bars(symbol, limit=60)
            technicals = technical_service.process_bars(symbol, bars)
            latest_ind = technicals.latest_indicators
            bars_count = len(bars)
        except Exception as e:
            logger.warning("Could not calculate technicals for market summary of %s: %s", symbol, e)
            latest_ind = None
            bars_count = 0

        return MarketSummary(
            symbol=symbol.upper(),
            quote=quote,
            technical_indicators=latest_ind,
            historical_bars_count=bars_count
        )

market_service = MarketDataService()
