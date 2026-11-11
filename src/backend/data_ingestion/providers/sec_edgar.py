"""
SEC EDGAR Public API Client
Authoritative regulatory filings and standardized GAAP/IFRS XBRL facts.
"""
import httpx
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from src.backend.data_ingestion.base import (
    BaseFundamentalProvider,
    NormalizedProfile,
    NormalizedFinancialStatement
)
from src.backend.data_ingestion.rate_limiter import rate_limiters
from src.backend.data_ingestion.cache_manager import cache
from src.backend.core.config import settings
from src.backend.core.logging import logger
from src.backend.core.exceptions import InstrumentNotFoundError

class SECEDGARClient(BaseFundamentalProvider):
    """Integrates official SEC EDGAR public APIs with mandatory User-Agent compliance."""
    def __init__(self):
        self.headers = {
            "User-Agent": settings.SEC_EDGAR_USER_AGENT,
            "Accept": "application/json"
        }
        self.timeout = 15.0

    @property
    def provider_name(self) -> str:
        return "sec_edgar"

    async def _resolve_cik(self, symbol: str) -> str:
        """Resolves ticker symbol to SEC 10-digit CIK."""
        cache_key = f"sec_cik_{symbol.upper()}"
        cached_cik = cache.get(cache_key)
        if cached_cik:
            return cached_cik

        await rate_limiters["sec_edgar"].acquire()
        async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
            resp = await client.get("https://www.sec.gov/files/company_tickers.json")
            if resp.status_code != 200:
                raise InstrumentNotFoundError(symbol, details={"sec_status": resp.status_code})

            data = resp.json()
            target_sym = symbol.upper()
            for entry in data.values():
                if entry.get("ticker") == target_sym:
                    cik = str(entry["cik_str"]).zfill(10)
                    cache.set(cache_key, cik, ttl_seconds=86400 * 30)  # CIK is permanent
                    return cik

            raise InstrumentNotFoundError(symbol, details={"reason": "CIK not indexed in SEC directory"})

    async def get_company_profile(self, symbol: str) -> NormalizedProfile:
        cik = await self._resolve_cik(symbol)
        cache_key = f"sec_profile_{cik}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        await rate_limiters["sec_edgar"].acquire()
        url = f"https://data.sec.gov/submissions/CIK{cik}.json"
        async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise InstrumentNotFoundError(symbol, details={"sec_status": resp.status_code})

            data = resp.json()
            profile = NormalizedProfile(
                symbol=symbol,
                company_name=data.get("name", ""),
                exchange=data.get("exchanges", ["SEC"])[0] if data.get("exchanges") else "SEC",
                currency="USD",
                industry=data.get("sicDescription"),
                cik=cik,
                provider=self.provider_name
            )
            cache.set(cache_key, profile, ttl_seconds=86400 * 7)
            return profile

    async def get_income_statement(self, symbol: str, limit: int = 5) -> List[NormalizedFinancialStatement]:
        cik = await self._resolve_cik(symbol)
        cache_key = f"sec_facts_{cik}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        await rate_limiters["sec_edgar"].acquire()
        url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
        async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise InstrumentNotFoundError(symbol, details={"sec_status": resp.status_code})

            data = resp.json()
            us_gaap = data.get("facts", {}).get("us-gaap", {})
            # Extract standard revenues concept
            revenue_data = us_gaap.get("Revenues", {}) or us_gaap.get("RevenueFromContractWithCustomerExcludingAssessedTax", {})
            units = revenue_data.get("units", {}).get("USD", [])

            statements: List[NormalizedFinancialStatement] = []
            annual_units = [u for u in units if u.get("form") in ("10-K", "20-F")]
            for item in sorted(annual_units, key=lambda x: x.get("end", ""), reverse=True)[:limit]:
                statements.append(NormalizedFinancialStatement(
                    symbol=symbol,
                    statement_type="INCOME",
                    fiscal_period=item.get("frame", "FY")[-2:] if "frame" in item else "FY",
                    fiscal_year=int(item.get("fy", 0)),
                    filing_date=date.fromisoformat(item.get("filed")),
                    reported_currency="USD",
                    source="SEC_EDGAR_XBRL",
                    metrics={
                        "revenue": item.get("val"),
                        "form": item.get("form"),
                        "accounting_standard": "US-GAAP"
                    }
                ))

            cache.set(cache_key, statements, ttl_seconds=86400 * 14)
            return statements
