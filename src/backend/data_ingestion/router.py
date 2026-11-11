"""
Multi-Provider Financial Data Router
Orchestrates primary and fallback provider routing across asset classes.
"""
from typing import List, Optional
from src.backend.data_ingestion.base import (
    NormalizedBar,
    NormalizedQuote,
    NormalizedProfile,
    NormalizedFinancialStatement,
    NormalizedNewsArticle,
    NormalizedFXRate
)
from src.backend.data_ingestion.providers.twelve_data import TwelveDataClient
from src.backend.data_ingestion.providers.fmp_stable import FMPStableClient
from src.backend.data_ingestion.providers.alpha_vantage import AlphaVantageClient
from src.backend.data_ingestion.providers.sec_edgar import SECEDGARClient
from src.backend.data_ingestion.providers.news_api import NewsAPIClient
from src.backend.data_ingestion.providers.fx_provider import ECBFXProvider
from src.backend.core.logging import logger
from src.backend.core.exceptions import (
    InstrumentNotFoundError,
    ProviderTierRestrictionError,
    ProviderRateLimitError
)

class FinancialDataRouter:
    """Unified routing engine with automatic provider failover and ADR proxy mapping."""
    def __init__(self):
        self.twelve_data = TwelveDataClient()
        self.fmp = FMPStableClient()
        self.alpha_vantage = AlphaVantageClient()
        self.sec_edgar = SECEDGARClient()
        self.news_api = NewsAPIClient()
        self.fx = ECBFXProvider()

        # Global Proxy Resolution for Free Tier Access:
        # Maps primary foreign tickers to US-listed ADR proxies
        self.adr_proxies = {
            "7203": "TM",          # Toyota Tokyo -> NYSE ADR
            "7203.T": "TM",
            "7203.TYO": "TM",
            "NESN": "NSRGY",       # Nestlé SIX -> US OTC ADR
            "NESN.SW": "NSRGY",
        }

    async def get_daily_history(
        self,
        symbol: str,
        exchange: Optional[str] = None,
        limit: int = 100
    ) -> List[NormalizedBar]:
        """Retrieves daily OHLCV bars with automatic failover."""
        # 1. Check for ADR proxy
        norm_sym = self.adr_proxies.get(symbol.upper(), symbol)

        # 2. UK London Stock Exchange tickers (.LON or LSE) route to Alpha Vantage
        if norm_sym.endswith(".LON") or exchange == "LSE":
            logger.info("Routing UK ticker %s to Alpha Vantage...", norm_sym)
            return await self.alpha_vantage.get_daily_history(norm_sym, exchange, limit)

        # 3. US equities: Primary Twelve Data -> Fallback FMP /stable/
        try:
            logger.info("Routing %s to primary provider Twelve Data...", norm_sym)
            return await self.twelve_data.get_daily_history(norm_sym, exchange, limit)
        except (ProviderRateLimitError, ProviderTierRestrictionError, InstrumentNotFoundError) as e:
            logger.warning("Twelve Data routing bypassed for %s (%s). Attempting FMP failover...", norm_sym, e)
            try:
                return await self.fmp.get_daily_history(norm_sym, exchange, limit)
            except Exception as fmp_err:
                logger.error("FMP failover failed for %s: %s", norm_sym, fmp_err)
                raise e  # Raise original exception if failover also fails

    async def get_company_profile(self, symbol: str) -> NormalizedProfile:
        """Retrieves company profile from FMP stable or SEC EDGAR."""
        norm_sym = self.adr_proxies.get(symbol.upper(), symbol)
        try:
            return await self.fmp.get_company_profile(norm_sym)
        except Exception as e:
            logger.warning("FMP profile failed for %s: %s. Trying SEC EDGAR...", norm_sym, e)
            return await self.sec_edgar.get_company_profile(norm_sym)

    async def get_income_statements(self, symbol: str, limit: int = 5) -> List[NormalizedFinancialStatement]:
        """Retrieves income statements from FMP stable or SEC EDGAR XBRL."""
        norm_sym = self.adr_proxies.get(symbol.upper(), symbol)
        try:
            return await self.fmp.get_income_statement(norm_sym, limit)
        except Exception as e:
            logger.warning("FMP financials failed for %s: %s. Trying SEC EDGAR XBRL...", norm_sym, e)
            return await self.sec_edgar.get_income_statement(norm_sym, limit)

    async def search_news(self, query: str, limit: int = 5) -> List[NormalizedNewsArticle]:
        """Retrieves news articles via NewsAPI."""
        return await self.news_api.search_news(query, limit)

    async def get_fx_rate(self, base_currency: str, target_currency: str) -> NormalizedFXRate:
        """Retrieves ECB exchange rates."""
        return await self.fx.get_rate(base_currency, target_currency)

# Singleton router instance
router = FinancialDataRouter()
