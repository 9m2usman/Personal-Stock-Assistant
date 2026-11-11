"""
Alpha Vantage Market Data Provider Implementation
Handles UK London Stock Exchange (LSE) and US Daily OHLCV (100 days compact).
"""
import httpx
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
from src.backend.data_ingestion.base import BaseMarketDataProvider, NormalizedBar, NormalizedQuote, DataFreshness
from src.backend.data_ingestion.rate_limiter import rate_limiters
from src.backend.data_ingestion.cache_manager import cache
from src.backend.core.config import settings
from src.backend.core.logging import logger
from src.backend.core.exceptions import (
    ProviderRateLimitError,
    InstrumentNotFoundError
)

class AlphaVantageClient(BaseMarketDataProvider):
    """Integrates Alpha Vantage for US and UK LSE historical daily prices."""
    def __init__(self):
        self.api_key = settings.ALPHA_VANTAGE_API_KEY.get_secret_value() if settings.ALPHA_VANTAGE_API_KEY else ""
        self.base_url = "https://www.alphavantage.co/query"
        self.timeout = 15.0

    @property
    def provider_name(self) -> str:
        return "alpha_vantage"

    async def get_daily_history(
        self,
        symbol: str,
        exchange: Optional[str] = None,
        limit: int = 100
    ) -> List[NormalizedBar]:
        cache_key = f"av_daily_{symbol}_{limit}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        await rate_limiters["alpha_vantage"].acquire()
        params = {
            "function": "TIME_SERIES_DAILY",
            "symbol": symbol,
            "outputsize": "compact",  # strictly 100 observations on free tier
            "apikey": self.api_key
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(self.base_url, params=params)
            except Exception as e:
                logger.error("Alpha Vantage network error: %s", e)
                raise InstrumentNotFoundError(symbol, details={"error": str(e)})

            data = resp.json()
            if "Note" in data or "Information" in data:
                # 25 req/day or 5 req/min exceeded
                msg = data.get("Note") or data.get("Information")
                raise ProviderRateLimitError("alpha_vantage", retry_after_sec=60)

            if "Error Message" in data:
                raise InstrumentNotFoundError(symbol, details={"error": data["Error Message"]})

            ts = data.get("Time Series (Daily)", {})
            if not ts:
                raise InstrumentNotFoundError(symbol, details=data)

            # Detect currency: London tickers (.LON) are in GBp
            currency = "GBp" if symbol.endswith(".LON") else "USD"

            bars: List[NormalizedBar] = []
            for dt_str in sorted(ts.keys(), reverse=True)[:limit]:
                bar_data = ts[dt_str]
                bars.append(NormalizedBar(
                    trade_date=date.fromisoformat(dt_str),
                    open=Decimal(str(bar_data["1. open"])),
                    high=Decimal(str(bar_data["2. high"])),
                    low=Decimal(str(bar_data["3. low"])),
                    close=Decimal(str(bar_data["4. close"])),
                    volume=int(bar_data["5. volume"]),
                    currency=currency,
                    provider=self.provider_name,
                    freshness=DataFreshness.END_OF_DAY
                ))

            cache.set(cache_key, bars, ttl_seconds=86400)  # Aggressive 24h cache to protect 25 req/day cap
            return bars

    async def get_quote(self, symbol: str, exchange: Optional[str] = None) -> NormalizedQuote:
        # Fallback to latest daily bar
        bars = await self.get_daily_history(symbol, exchange, limit=1)
        if not bars:
            raise InstrumentNotFoundError(symbol)
        latest = bars[0]
        return NormalizedQuote(
            symbol=symbol,
            price=latest.close,
            currency=latest.currency,
            exchange="LSE" if symbol.endswith(".LON") else "US",
            as_of=datetime.combine(latest.trade_date, datetime.min.time()),
            provider=self.provider_name,
            freshness=DataFreshness.END_OF_DAY
        )
