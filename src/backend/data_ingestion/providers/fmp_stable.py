"""
Financial Modeling Prep (FMP) /stable/ Provider Implementation
"""
import httpx
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
from src.backend.data_ingestion.base import (
    BaseMarketDataProvider,
    BaseFundamentalProvider,
    NormalizedBar,
    NormalizedQuote,
    NormalizedProfile,
    NormalizedFinancialStatement,
    DataFreshness
)
from src.backend.data_ingestion.rate_limiter import rate_limiters
from src.backend.data_ingestion.cache_manager import cache
from src.backend.core.config import settings
from src.backend.core.logging import logger
from src.backend.core.exceptions import (
    ProviderRateLimitError,
    ProviderTierRestrictionError,
    InstrumentNotFoundError
)

class FMPStableClient(BaseMarketDataProvider, BaseFundamentalProvider):
    """Integrates Financial Modeling Prep /stable/ endpoints."""
    def __init__(self):
        self.api_key = settings.FMP_API_KEY.get_secret_value() if settings.FMP_API_KEY else ""
        self.base_url = "https://financialmodelingprep.com/stable"
        self.timeout = 15.0

    @property
    def provider_name(self) -> str:
        return "fmp_stable"

    async def get_daily_history(
        self,
        symbol: str,
        exchange: Optional[str] = None,
        limit: int = 100
    ) -> List[NormalizedBar]:
        cache_key = f"fmp_daily_{symbol}_{limit}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        await rate_limiters["fmp"].acquire()
        url = f"{self.base_url}/historical-price-eod/full"
        params = {"symbol": symbol, "apikey": self.api_key}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 402:
                raise ProviderTierRestrictionError("fmp", symbol, "Paid Subscription Plan")
            if resp.status_code == 429:
                raise ProviderRateLimitError("fmp")
            if resp.status_code != 200:
                raise InstrumentNotFoundError(symbol, details={"status_code": resp.status_code})

            data = resp.json()
            if not isinstance(data, list):
                raise InstrumentNotFoundError(symbol, details=data)

            bars: List[NormalizedBar] = []
            for item in data[:limit]:
                bars.append(NormalizedBar(
                    trade_date=date.fromisoformat(item["date"]),
                    open=Decimal(str(item["open"])),
                    high=Decimal(str(item["high"])),
                    low=Decimal(str(item["low"])),
                    close=Decimal(str(item["close"])),
                    volume=int(item["volume"]) if item.get("volume") else 0,
                    currency="USD",
                    provider=self.provider_name,
                    freshness=DataFreshness.END_OF_DAY
                ))

            cache.set(cache_key, bars, ttl_seconds=3600)
            return bars

    async def get_quote(self, symbol: str, exchange: Optional[str] = None) -> NormalizedQuote:
        cache_key = f"fmp_quote_{symbol}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        await rate_limiters["fmp"].acquire()
        url = f"{self.base_url}/quote"
        params = {"symbol": symbol, "apikey": self.api_key}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 402:
                raise ProviderTierRestrictionError("fmp", symbol, "Paid Subscription Plan")
            if resp.status_code != 200:
                raise InstrumentNotFoundError(symbol, details={"status_code": resp.status_code})

            data = resp.json()
            if not isinstance(data, list) or not data:
                raise InstrumentNotFoundError(symbol)

            item = data[0]
            quote = NormalizedQuote(
                symbol=item.get("symbol", symbol),
                price=Decimal(str(item.get("price", "0"))),
                change=Decimal(str(item.get("change", "0"))),
                change_percent=Decimal(str(item.get("changePercentage", "0"))),
                volume=int(item.get("volume", 0)),
                currency="USD",
                exchange="US",
                as_of=datetime.now(),
                provider=self.provider_name,
                freshness=DataFreshness.DELAYED
            )
            cache.set(cache_key, quote, ttl_seconds=60)
            return quote

    async def get_company_profile(self, symbol: str) -> NormalizedProfile:
        cache_key = f"fmp_profile_{symbol}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        await rate_limiters["fmp"].acquire()
        url = f"{self.base_url}/profile"
        params = {"symbol": symbol, "apikey": self.api_key}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 402:
                raise ProviderTierRestrictionError("fmp", symbol, "Paid Subscription Plan")
            if resp.status_code != 200:
                raise InstrumentNotFoundError(symbol, details={"status_code": resp.status_code})

            data = resp.json()
            if not isinstance(data, list) or not data:
                raise InstrumentNotFoundError(symbol)

            item = data[0]
            profile = NormalizedProfile(
                symbol=item.get("symbol", symbol),
                company_name=item.get("companyName", ""),
                exchange=item.get("exchangeShortName", "Unknown"),
                currency=item.get("currency", "USD"),
                industry=item.get("industry"),
                sector=item.get("sector"),
                market_cap=Decimal(str(item.get("marketCap", "0"))) if item.get("marketCap") else None,
                beta=Decimal(str(item.get("beta", "0"))) if item.get("beta") else None,
                description=item.get("description"),
                cik=item.get("cik"),
                provider=self.provider_name
            )
            cache.set(cache_key, profile, ttl_seconds=86400)
            return profile

    async def get_income_statement(self, symbol: str, limit: int = 5) -> List[NormalizedFinancialStatement]:
        cache_key = f"fmp_income_{symbol}_{limit}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        await rate_limiters["fmp"].acquire()
        url = f"{self.base_url}/income-statement"
        params = {"symbol": symbol, "limit": limit, "apikey": self.api_key}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 402:
                raise ProviderTierRestrictionError("fmp", symbol, "Paid Subscription Plan")
            if resp.status_code != 200:
                raise InstrumentNotFoundError(symbol, details={"status_code": resp.status_code})

            data = resp.json()
            if not isinstance(data, list):
                raise InstrumentNotFoundError(symbol, details=data)

            statements: List[NormalizedFinancialStatement] = []
            for item in data:
                statements.append(NormalizedFinancialStatement(
                    symbol=item.get("symbol", symbol),
                    statement_type="INCOME",
                    fiscal_period=item.get("period", "FY"),
                    fiscal_year=int(item.get("fiscalYear") or item.get("calendarYear") or 0),
                    filing_date=date.fromisoformat(item.get("filingDate") or item.get("date")),
                    reported_currency=item.get("reportedCurrency", "USD"),
                    source=self.provider_name,
                    metrics={
                        "revenue": item.get("revenue"),
                        "costOfRevenue": item.get("costOfRevenue"),
                        "grossProfit": item.get("grossProfit"),
                        "netIncome": item.get("netIncome"),
                        "eps": item.get("eps")
                    }
                ))

            cache.set(cache_key, statements, ttl_seconds=86400 * 7)
            return statements
