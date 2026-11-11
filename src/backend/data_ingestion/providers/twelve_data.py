"""
Twelve Data Market Data Provider Implementation
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
    ProviderTierRestrictionError,
    InstrumentNotFoundError
)

class TwelveDataClient(BaseMarketDataProvider):
    """Integrates Twelve Data REST API for US equity prices and symbol search."""
    def __init__(self):
        self.api_key = settings.TWELVE_DATA_API_KEY.get_secret_value() if settings.TWELVE_DATA_API_KEY else ""
        self.base_url = "https://api.twelvedata.com"
        self.timeout = getattr(settings, "PROVIDER_TIMEOUT_SECONDS", 3.5)

    @property
    def provider_name(self) -> str:
        return "twelve_data"

    async def get_daily_history(
        self,
        symbol: str,
        exchange: Optional[str] = None,
        limit: int = 100
    ) -> List[NormalizedBar]:
        cache_key = f"td_daily_{symbol}_{exchange}_{limit}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        await rate_limiters["twelve_data"].acquire()
        params = {
            "symbol": symbol,
            "interval": "1day",
            "outputsize": min(limit, 100),
            "apikey": self.api_key
        }
        if exchange:
            params["exchange"] = exchange

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(f"{self.base_url}/time_series", params=params)
            except Exception as e:
                logger.error("Twelve Data request error for %s: %s", symbol, e)
                raise InstrumentNotFoundError(symbol, details={"error": str(e)})

            if resp.status_code == 404:
                body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                msg = body.get("message", "")
                if "Grow or Venture" in msg:
                    raise ProviderTierRestrictionError("twelve_data", symbol, "Grow Plan ($79/mo) or Venture Plan ($499/mo)")
                elif "Pro or Venture" in msg:
                    raise ProviderTierRestrictionError("twelve_data", symbol, "Pro Plan ($229/mo) or Venture Plan ($499/mo)")
                else:
                    raise InstrumentNotFoundError(symbol, details=body)

            if resp.status_code == 429:
                raise ProviderRateLimitError("twelve_data")

            data = resp.json()
            if data.get("status") == "error":
                code = data.get("code")
                msg = data.get("message", "")
                if code == 429:
                    raise ProviderRateLimitError("twelve_data")
                elif "plan" in msg.lower():
                    raise ProviderTierRestrictionError("twelve_data", symbol, msg)
                raise InstrumentNotFoundError(symbol, details=data)

            values = data.get("values", [])
            meta = data.get("meta", {})
            currency = meta.get("currency", "USD")

            bars: List[NormalizedBar] = []
            for item in values:
                bars.append(NormalizedBar(
                    trade_date=date.fromisoformat(item["datetime"]),
                    open=Decimal(str(item["open"])),
                    high=Decimal(str(item["high"])),
                    low=Decimal(str(item["low"])),
                    close=Decimal(str(item["close"])),
                    volume=int(item["volume"]) if item.get("volume") and item["volume"] != "N/A" else 0,
                    currency=currency,
                    provider=self.provider_name,
                    freshness=DataFreshness.END_OF_DAY
                ))

            cache.set(cache_key, bars, ttl_seconds=3600)  # Cache daily bars for 1 hour
            return bars

    async def get_quote(self, symbol: str, exchange: Optional[str] = None) -> NormalizedQuote:
        cache_key = f"td_quote_{symbol}_{exchange}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        await rate_limiters["twelve_data"].acquire()
        params = {"symbol": symbol, "apikey": self.api_key}
        if exchange:
            params["exchange"] = exchange

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(f"{self.base_url}/quote", params=params)
            if resp.status_code != 200:
                raise InstrumentNotFoundError(symbol, details={"status_code": resp.status_code})

            data = resp.json()
            if data.get("status") == "error":
                raise InstrumentNotFoundError(symbol, details=data)

            quote = NormalizedQuote(
                symbol=data.get("symbol", symbol),
                price=Decimal(str(data.get("close") or data.get("previous_close") or "0")),
                change=Decimal(str(data.get("change") or "0")),
                change_percent=Decimal(str(data.get("percent_change") or "0")),
                volume=int(data.get("volume") or 0),
                currency=data.get("currency", "USD"),
                exchange=data.get("exchange", "Unknown"),
                as_of=datetime.now(),
                provider=self.provider_name,
                freshness=DataFreshness.REAL_TIME
            )
            cache.set(cache_key, quote, ttl_seconds=60)  # Cache quote for 60 seconds
            return quote
