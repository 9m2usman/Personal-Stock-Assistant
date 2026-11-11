"""
Unified Instrument Search & Resolution Service
Provides provider-independent symbol resolution, multi-exchange listings, and watchlist aggregation.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from decimal import Decimal
import asyncio
import uuid
import httpx

from src.backend.data_ingestion.base import (
    NormalizedInstrument,
    NormalizedQuote,
    DataFreshness
)
from src.backend.core.config import settings
from src.backend.core.logging import logger
from src.backend.models.instrument import Instrument, Exchange
from src.backend.core.database import async_session_factory
from sqlalchemy import select

# Canonical Institutional Universe covering US and International Primary Listings and ADRs
INSTITUTIONAL_UNIVERSE: List[Dict[str, Any]] = [
    # US Mega-Caps
    {
        "id": "inst-nvda-xngs",
        "company_name": "NVIDIA Corporation",
        "display_symbol": "NVDA",
        "provider_symbols": {"alpha_vantage": "NVDA", "fmp": "NVDA", "twelve_data": "NVDA"},
        "exchange_mic": "XNGS",
        "exchange_name": "NASDAQ",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "cik": "0001045810",
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    {
        "id": "inst-aapl-xngs",
        "company_name": "Apple Inc.",
        "display_symbol": "AAPL",
        "provider_symbols": {"alpha_vantage": "AAPL", "fmp": "AAPL", "twelve_data": "AAPL"},
        "exchange_mic": "XNGS",
        "exchange_name": "NASDAQ",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "cik": "0000320193",
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    {
        "id": "inst-msft-xngs",
        "company_name": "Microsoft Corporation",
        "display_symbol": "MSFT",
        "provider_symbols": {"alpha_vantage": "MSFT", "fmp": "MSFT", "twelve_data": "MSFT"},
        "exchange_mic": "XNGS",
        "exchange_name": "NASDAQ",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "cik": "0000789019",
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    {
        "id": "inst-googl-xngs",
        "company_name": "Alphabet Inc. (Class A)",
        "display_symbol": "GOOGL",
        "provider_symbols": {"alpha_vantage": "GOOGL", "fmp": "GOOGL", "twelve_data": "GOOGL"},
        "exchange_mic": "XNGS",
        "exchange_name": "NASDAQ",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "cik": "0001652044",
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    {
        "id": "inst-amzn-xngs",
        "company_name": "Amazon.com Inc.",
        "display_symbol": "AMZN",
        "provider_symbols": {"alpha_vantage": "AMZN", "fmp": "AMZN", "twelve_data": "AMZN"},
        "exchange_mic": "XNGS",
        "exchange_name": "NASDAQ",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "cik": "0001018724",
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    {
        "id": "inst-meta-xngs",
        "company_name": "Meta Platforms Inc.",
        "display_symbol": "META",
        "provider_symbols": {"alpha_vantage": "META", "fmp": "META", "twelve_data": "META"},
        "exchange_mic": "XNGS",
        "exchange_name": "NASDAQ",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "cik": "0001326801",
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    {
        "id": "inst-tsla-xngs",
        "company_name": "Tesla Inc.",
        "display_symbol": "TSLA",
        "provider_symbols": {"alpha_vantage": "TSLA", "fmp": "TSLA", "twelve_data": "TSLA"},
        "exchange_mic": "XNGS",
        "exchange_name": "NASDAQ",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "cik": "0001318605",
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    {
        "id": "inst-amd-xngs",
        "company_name": "Advanced Micro Devices Inc.",
        "display_symbol": "AMD",
        "provider_symbols": {"alpha_vantage": "AMD", "fmp": "AMD", "twelve_data": "AMD"},
        "exchange_mic": "XNGS",
        "exchange_name": "NASDAQ",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "cik": "0000002488",
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    {
        "id": "inst-avgo-xngs",
        "company_name": "Broadcom Inc.",
        "display_symbol": "AVGO",
        "provider_symbols": {"alpha_vantage": "AVGO", "fmp": "AVGO", "twelve_data": "AVGO"},
        "exchange_mic": "XNGS",
        "exchange_name": "NASDAQ",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "cik": "0001730168",
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    {
        "id": "inst-jpm-xnys",
        "company_name": "JPMorgan Chase & Co.",
        "display_symbol": "JPM",
        "provider_symbols": {"alpha_vantage": "JPM", "fmp": "JPM", "twelve_data": "JPM"},
        "exchange_mic": "XNYS",
        "exchange_name": "NYSE",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "cik": "0000019617",
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    # International Primary Listings (Explicitly Preserved)
    {
        "id": "inst-hsba-xlon",
        "company_name": "HSBC Holdings plc",
        "display_symbol": "HSBA.L",
        "provider_symbols": {"alpha_vantage": "HSBA.LON", "fmp": "HSBA.L", "twelve_data": "HSBA"},
        "exchange_mic": "XLON",
        "exchange_name": "London Stock Exchange",
        "country": "United Kingdom",
        "currency": "GBP",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    {
        "id": "inst-7203-xjpx",
        "company_name": "Toyota Motor Corporation (Primary)",
        "display_symbol": "7203.T",
        "provider_symbols": {"alpha_vantage": "7203.T", "fmp": "7203.T", "twelve_data": "7203"},
        "exchange_mic": "XJPX",
        "exchange_name": "Tokyo Stock Exchange",
        "country": "Japan",
        "currency": "JPY",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "related_adr_symbol": "TM",
        "provider_availability": {"quote": False, "history": False, "fundamentals": True}
    },
    {
        "id": "inst-nesn-xswx",
        "company_name": "Nestlé S.A. (Primary)",
        "display_symbol": "NESN.SW",
        "provider_symbols": {"alpha_vantage": "NESN.SW", "fmp": "NESN.SW", "twelve_data": "NESN"},
        "exchange_mic": "XSWX",
        "exchange_name": "SIX Swiss Exchange",
        "country": "Switzerland",
        "currency": "CHF",
        "instrument_type": "Common Stock",
        "listing_type": "Primary",
        "is_adr": False,
        "related_adr_symbol": "NSRGY",
        "provider_availability": {"quote": False, "history": False, "fundamentals": True}
    },
    # US-listed ADRs (Clearly Labeled as ADRs)
    {
        "id": "inst-tm-xnys",
        "company_name": "Toyota Motor Corporation (ADR)",
        "display_symbol": "TM",
        "provider_symbols": {"alpha_vantage": "TM", "fmp": "TM", "twelve_data": "TM"},
        "exchange_mic": "XNYS",
        "exchange_name": "NYSE",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "ADR",
        "listing_type": "ADR",
        "is_adr": True,
        "cik": "0001094517",
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    },
    {
        "id": "inst-nsrgy-otcm",
        "company_name": "Nestlé S.A. (Sponsored ADR)",
        "display_symbol": "NSRGY",
        "provider_symbols": {"alpha_vantage": "NSRGY", "fmp": "NSRGY", "twelve_data": "NSRGY"},
        "exchange_mic": "OTCM",
        "exchange_name": "OTC Markets",
        "country": "United States",
        "currency": "USD",
        "instrument_type": "ADR",
        "listing_type": "ADR",
        "is_adr": True,
        "provider_availability": {"quote": True, "history": True, "fundamentals": True}
    }
]

class InstrumentService:
    """Institutional instrument search, resolution, and watchlist engine."""

    def __init__(self):
        self._universe: List[NormalizedInstrument] = [
            NormalizedInstrument(**item) for item in INSTITUTIONAL_UNIVERSE
        ]
        self._symbol_map: Dict[str, NormalizedInstrument] = {}
        for inst in self._universe:
            # Map display symbol
            self._symbol_map[inst.display_symbol.upper()] = inst
            # Map stripped symbol (e.g. HSBA from HSBA.L)
            stripped = inst.display_symbol.split(".")[0].upper()
            if stripped not in self._symbol_map:
                self._symbol_map[stripped] = inst
            # Map provider symbols
            for _, p_sym in inst.provider_symbols.items():
                p_sym_upper = p_sym.upper()
                if p_sym_upper not in self._symbol_map:
                    self._symbol_map[p_sym_upper] = inst

    def get_by_symbol(self, symbol: str) -> Optional[NormalizedInstrument]:
        """Resolves symbol directly from canonical universe."""
        clean = symbol.strip().upper()
        return self._symbol_map.get(clean)

    async def search(
        self,
        query: str,
        exchange: Optional[str] = None,
        limit: int = 15
    ) -> List[NormalizedInstrument]:
        """
        Searches canonical universe and merges external provider suggestions.
        Supports search by ticker, company name, exchange, country, and instrument type.
        """
        q = query.strip().upper()
        if not q:
            return self._universe[:limit]

        results: List[NormalizedInstrument] = []
        seen_ids = set()

        # Score matching
        scored_matches = []
        for inst in self._universe:
            score = 0
            sym = inst.display_symbol.upper()
            cname = inst.company_name.upper()
            mic = inst.exchange_mic.upper()
            ex_name = inst.exchange_name.upper()
            country = inst.country.upper()
            itype = inst.instrument_type.upper()

            if exchange and exchange.upper() not in [mic, ex_name]:
                continue

            if sym == q:
                score += 100
            elif sym.startswith(q):
                score += 50
            elif q in sym:
                score += 30

            if q in cname:
                score += 40
            if q in ex_name or q == mic:
                score += 20
            if q in country:
                score += 15
            if q in itype:
                score += 10

            if score > 0:
                scored_matches.append((score, inst))

        scored_matches.sort(key=lambda x: x[0], reverse=True)
        for _, inst in scored_matches:
            if inst.id not in seen_ids:
                seen_ids.add(inst.id)
                results.append(inst)
                if len(results) >= limit:
                    return results

        return results

    async def get_watchlist(self) -> List[Dict[str, Any]]:
        """
        Retrieves real-time/cached overview for the diversified core watchlist:
        NVDA, AAPL, MSFT, TSLA, AMZN, HSBA.L.
        Executes concurrently with TTL caching for high performance.
        """
        from src.backend.services.market_service import market_service
        from src.backend.data_ingestion.cache_manager import cache
        import asyncio

        cached_wl = cache.get("canonical_watchlist_snapshot")
        if cached_wl:
            return cached_wl

        default_symbols = ["NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "HSBA.L"]

        async def _fetch_item(sym: str) -> Dict[str, Any]:
            inst = self.get_by_symbol(sym)
            c_name = inst.company_name if inst else sym
            ex_name = inst.exchange_name if inst else "US"
            curr = inst.currency if inst else "USD"

            try:
                quote = await market_service.get_realtime_quote(sym)
                return {
                    "symbol": quote.symbol,
                    "company_name": c_name,
                    "exchange": quote.exchange or ex_name,
                    "currency": quote.currency or curr,
                    "price": float(quote.price),
                    "change": float(quote.change) if quote.change is not None else 0.0,
                    "change_percent": float(quote.change_percent) if quote.change_percent is not None else 0.0,
                    "volume": quote.volume,
                    "as_of": quote.as_of.isoformat(),
                    "freshness": quote.freshness.value,
                    "provider": quote.provider,
                    "is_adr": inst.is_adr if inst else False,
                    "listing_type": inst.listing_type if inst else "Primary"
                }
            except Exception as e:
                logger.warning("Could not fetch live quote for %s in watchlist: %s", sym, e)
                return {
                    "symbol": sym,
                    "company_name": c_name,
                    "exchange": ex_name,
                    "currency": curr,
                    "price": None,
                    "change": None,
                    "change_percent": None,
                    "as_of": datetime.now(timezone.utc).isoformat(),
                    "freshness": "UNAVAILABLE",
                    "provider": "N/A",
                    "error": str(e),
                    "is_adr": inst.is_adr if inst else False,
                    "listing_type": inst.listing_type if inst else "Primary"
                }

        tasks = [_fetch_item(sym) for sym in default_symbols]
        watchlist_items = await asyncio.gather(*tasks)
        cache.set("canonical_watchlist_snapshot", watchlist_items, ttl_seconds=60)
        return list(watchlist_items)

    async def seed_database_if_empty(self) -> int:
        """Seeds canonical exchanges and instruments into DB if missing."""
        seeded_count = 0
        try:
            async with async_session_factory() as session:
                res = await session.execute(select(Instrument))
                existing = {inst.symbol.upper() for inst in res.scalars().all()}

                # Exchanges to seed
                exchanges = {
                    "XNGS": ("NASDAQ - All Markets", "United States", "USD", "America/New_York"),
                    "XNYS": ("New York Stock Exchange", "United States", "USD", "America/New_York"),
                    "XLON": ("London Stock Exchange", "United Kingdom", "GBP", "Europe/London"),
                    "XJPX": ("Tokyo Stock Exchange", "Japan", "JPY", "Asia/Tokyo"),
                    "XSWX": ("SIX Swiss Exchange", "Switzerland", "CHF", "Europe/Zurich"),
                    "OTCM": ("OTC Markets", "United States", "USD", "America/New_York"),
                }

                for mic, (name, country, curr, tz) in exchanges.items():
                    ex_res = await session.execute(select(Exchange).where(Exchange.mic_code == mic))
                    if not ex_res.scalars().first():
                        session.add(Exchange(
                            mic_code=mic,
                            name=name,
                            country=country,
                            currency=curr,
                            timezone=tz
                        ))

                await session.flush()

                for item in INSTITUTIONAL_UNIVERSE:
                    sym = item["display_symbol"].upper()
                    if sym not in existing:
                        session.add(Instrument(
                            id=item["id"],
                            symbol=item["display_symbol"],
                            exchange_mic=item["exchange_mic"],
                            company_name=item["company_name"],
                            asset_type=item["instrument_type"],
                            trading_currency=item["currency"],
                            is_adr=item["is_adr"],
                            cik=item.get("cik")
                        ))
                        seeded_count += 1

                if seeded_count > 0:
                    await session.commit()
                    logger.info("Successfully seeded %d institutional instruments into DB.", seeded_count)

        except Exception as e:
            logger.warning("Database instrument seeding skipped: %s", e)

        return seeded_count

instrument_service = InstrumentService()
