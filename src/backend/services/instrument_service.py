"""
Unified Instrument Search & Resolution Service
Provides provider-independent symbol resolution, multi-exchange listings,
database-backed pagination, and watchlist aggregation.
"""
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone
import asyncio
import json

from sqlalchemy import select, func, or_
from src.backend.data_ingestion.base import (
    NormalizedInstrument,
    NormalizedQuote,
    DataFreshness
)
from src.backend.core.config import settings
from src.backend.core.logging import logger
from src.backend.models.instrument import Instrument, Exchange
from src.backend.core.database import async_session_factory
from src.backend.services.catalog_sync_service import (
    catalog_sync_service,
    CURATED_GLOBAL_STOCKS,
    CANONICAL_EXCHANGES
)

INSTITUTIONAL_UNIVERSE: List[Dict[str, Any]] = [
    {
        "id": f"inst-{item['symbol'].lower().replace('.', '-')}-{item['mic'].lower()}",
        "company_name": item["name"],
        "display_symbol": item["symbol"],
        "provider_symbols": {
            "twelve_data": item["symbol"].split(".")[0],
            "fmp": item["symbol"],
            "alpha_vantage": item["symbol"]
        },
        "exchange_mic": item["mic"],
        "exchange_name": CANONICAL_EXCHANGES.get(item["mic"], (item["mic"], item.get("country", "US"), item["curr"], ""))[0],
        "country": item["country"],
        "currency": item["curr"],
        "instrument_type": item["type"],
        "listing_type": item.get("listing", "Primary"),
        "is_adr": item.get("is_adr", False),
        "related_adr_symbol": item.get("related_adr_symbol"),
        "cik": item.get("cik"),
        "sector": item.get("sector"),
        "industry": item.get("industry"),
        "provider_availability": {
            "quote": True,
            "history": True,
            "fundamentals": True,
            "news": True,
            "technicals": True
        }
    }
    for item in CURATED_GLOBAL_STOCKS
]

class InstrumentService:
    """Institutional instrument search, resolution, and watchlist engine."""

    def __init__(self):
        # In-memory fast cache populated from curated universe
        self._curated_map: Dict[str, NormalizedInstrument] = {}
        for item in CURATED_GLOBAL_STOCKS:
            sym = item["symbol"]
            mic = item["mic"]
            ex_name, country, curr, _ = CANONICAL_EXCHANGES.get(mic, (mic, item.get("country", "US"), item["curr"], ""))
            inst = NormalizedInstrument(
                id=f"inst-{sym.lower().replace('.', '-')}-{mic.lower()}",
                company_name=item["name"],
                display_symbol=sym,
                provider_symbols={
                    "twelve_data": sym.split(".")[0],
                    "fmp": sym,
                    "alpha_vantage": sym
                },
                exchange_mic=mic,
                exchange_name=ex_name,
                country=country,
                currency=curr,
                instrument_type=item["type"],
                listing_type=item.get("listing", "Primary"),
                is_adr=item.get("is_adr", False),
                related_adr_symbol=item.get("related_adr_symbol"),
                cik=item.get("cik"),
                sector=item.get("sector"),
                industry=item.get("industry"),
                provider_availability={
                    "quote": True,
                    "history": True,
                    "fundamentals": True,
                    "news": True,
                    "technicals": True
                },
                coverage={
                    "quote": True,
                    "history": True,
                    "fundamentals": True,
                    "news": True,
                    "technicals": True
                }
            )
            # Map by exact display symbol
            self._curated_map[sym.upper()] = inst
            # Map by bare ticker (e.g. HSBA from HSBA.L)
            bare = sym.split(".")[0].upper()
            if bare not in self._curated_map:
                self._curated_map[bare] = inst

    def get_by_symbol(self, symbol: str) -> Optional[NormalizedInstrument]:
        """Resolves symbol from in-memory fast catalog or returns None."""
        clean = symbol.strip().upper()
        return self._curated_map.get(clean)

    async def search(
        self,
        query: str = "",
        exchange: Optional[str] = None,
        country: Optional[str] = None,
        asset_type: Optional[str] = None,
        sector: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[NormalizedInstrument]:
        """
        Searches normalized instruments across database and curated universe.
        Supports company name, ticker symbol, exchange, country, and asset type filters.
        """
        q = query.strip().upper()

        try:
            async with async_session_factory() as session:
                stmt = select(Instrument)

                # Filter by text search
                if q:
                    stmt = stmt.where(
                        or_(
                            Instrument.symbol.ilike(f"{q}%"),
                            Instrument.symbol.ilike(f"%{q}%"),
                            Instrument.company_name.ilike(f"%{q}%"),
                            Instrument.cik.ilike(f"%{q}%")
                        )
                    )

                # Filter by exchange
                if exchange:
                    ex_clean = exchange.strip().upper()
                    stmt = stmt.where(
                        or_(
                            Instrument.exchange_mic.ilike(ex_clean),
                            Instrument.exchange_mic.in_([ex_clean, f"X{ex_clean}"])
                        )
                    )

                # Filter by country
                if country:
                    stmt = stmt.where(Instrument.country.ilike(f"%{country.strip()}%"))

                # Filter by asset type
                if asset_type:
                    stmt = stmt.where(Instrument.asset_type.ilike(f"%{asset_type.strip()}%"))

                # Filter by sector
                if sector:
                    stmt = stmt.where(Instrument.sector.ilike(f"%{sector.strip()}%"))

                stmt = stmt.order_by(
                    # Exact symbol match first
                    (Instrument.symbol == q).desc() if q else Instrument.symbol,
                    Instrument.symbol
                ).offset(offset).limit(limit)

                res = await session.execute(stmt)
                db_rows = res.scalars().all()

                if db_rows:
                    results = []
                    for row in db_rows:
                        prov_syms = json.loads(row.provider_symbols) if row.provider_symbols else {
                            "twelve_data": row.symbol.split(".")[0],
                            "fmp": row.symbol,
                            "alpha_vantage": row.symbol
                        }
                        prov_avail = json.loads(row.provider_availability) if row.provider_availability else {
                            "quote": True, "history": True, "fundamentals": True, "news": True, "technicals": True
                        }
                        ex_info = CANONICAL_EXCHANGES.get(row.exchange_mic, (row.exchange_mic, row.country or "US", row.trading_currency, ""))

                        results.append(NormalizedInstrument(
                            id=row.id,
                            company_name=row.company_name,
                            display_symbol=row.symbol,
                            provider_symbols=prov_syms,
                            exchange_mic=row.exchange_mic,
                            exchange_name=ex_info[0],
                            country=row.country or ex_info[1],
                            currency=row.trading_currency,
                            instrument_type=row.asset_type,
                            listing_type=row.listing_type,
                            is_adr=row.is_adr,
                            related_adr_symbol=row.related_adr_symbol,
                            cik=row.cik,
                            isin=row.isin,
                            sector=row.sector,
                            industry=row.industry,
                            provider_availability=prov_avail,
                            coverage=prov_avail
                        ))
                    return results

        except Exception as e:
            logger.warning("Database search failed, falling back to memory: %s", e)

        # In-memory search fallback
        filtered = []
        for inst in self._curated_map.values():
            if exchange and exchange.upper() not in [inst.exchange_mic.upper(), inst.exchange_name.upper()]:
                continue
            if country and country.upper() not in inst.country.upper():
                continue
            if asset_type and asset_type.upper() not in inst.instrument_type.upper():
                continue
            if sector and inst.sector and sector.upper() not in inst.sector.upper():
                continue

            if not q:
                filtered.append(inst)
            else:
                sym_match = q in inst.display_symbol.upper()
                name_match = q in inst.company_name.upper()
                if sym_match or name_match:
                    filtered.append(inst)

        # Deduplicate by symbol
        seen = set()
        deduped = []
        for item in filtered:
            if item.display_symbol not in seen:
                seen.add(item.display_symbol)
                deduped.append(item)

        return deduped[offset:offset + limit]

    async def search_paginated(
        self,
        query: str = "",
        exchange: Optional[str] = None,
        country: Optional[str] = None,
        asset_type: Optional[str] = None,
        sector: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """Returns paginated instrument search results with total count."""
        page = max(1, page)
        page_size = max(1, min(100, page_size))
        offset = (page - 1) * page_size

        q = query.strip().upper()
        total_count = 0

        try:
            async with async_session_factory() as session:
                count_stmt = select(func.count(Instrument.id))

                if q:
                    count_stmt = count_stmt.where(
                        or_(
                            Instrument.symbol.ilike(f"{q}%"),
                            Instrument.symbol.ilike(f"%{q}%"),
                            Instrument.company_name.ilike(f"%{q}%"),
                            Instrument.cik.ilike(f"%{q}%")
                        )
                    )
                if exchange:
                    count_stmt = count_stmt.where(Instrument.exchange_mic.ilike(f"%{exchange.strip()}%"))
                if country:
                    count_stmt = count_stmt.where(Instrument.country.ilike(f"%{country.strip()}%"))
                if asset_type:
                    count_stmt = count_stmt.where(Instrument.asset_type.ilike(f"%{asset_type.strip()}%"))
                if sector:
                    count_stmt = count_stmt.where(Instrument.sector.ilike(f"%{sector.strip()}%"))

                total_res = await session.execute(count_stmt)
                total_count = total_res.scalar() or 0
        except Exception:
            total_count = len(self._curated_map)

        items = await self.search(
            query=query,
            exchange=exchange,
            country=country,
            asset_type=asset_type,
            sector=sector,
            limit=page_size,
            offset=offset
        )

        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1

        return {
            "items": [item.model_dump() for item in items],
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }

    async def get_watchlist(self) -> List[Dict[str, Any]]:
        """
        Retrieves real-time/cached overview for the core watchlist:
        NVDA, AAPL, MSFT, TSLA, AMZN, HSBA.L, 7203.T, NESN.SW.
        """
        from src.backend.services.market_service import market_service
        from src.backend.data_ingestion.cache_manager import cache

        cached_wl = cache.get("canonical_watchlist_snapshot_v2")
        if cached_wl:
            return cached_wl

        watchlist_symbols = ["NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "HSBA.L", "TM", "NESN.SW"]

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

        tasks = [_fetch_item(sym) for sym in watchlist_symbols]
        watchlist_items = await asyncio.gather(*tasks)
        cache.set("canonical_watchlist_snapshot_v2", watchlist_items, ttl_seconds=60)
        return list(watchlist_items)

    async def seed_database_if_empty(self) -> int:
        """Seeds curated universe and exchanges if database is empty or unpopulated."""
        seeded = await catalog_sync_service.sync_curated_universe()
        return seeded

instrument_service = InstrumentService()
