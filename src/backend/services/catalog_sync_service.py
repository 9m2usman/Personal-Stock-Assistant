"""
Catalog Synchronization Engine
Manages multi-provider instrument ingestion, exchange resolution, deduplication,
and database synchronization across US, European, and Asian equity markets.
"""
from typing import List, Dict, Any, Optional, Tuple
import asyncio
import json
import uuid
import httpx
from datetime import datetime, timezone

from sqlalchemy import select, func, or_
from src.backend.core.database import async_session_factory
from src.backend.models.instrument import Instrument, Exchange
from src.backend.core.config import settings
from src.backend.core.logging import logger
from src.backend.data_ingestion.base import NormalizedInstrument

# Canonical Institutional Exchanges
CANONICAL_EXCHANGES: Dict[str, Tuple[str, str, str, str]] = {
    "XNGS": ("NASDAQ - All Markets", "United States", "USD", "America/New_York"),
    "XNYS": ("New York Stock Exchange", "United States", "USD", "America/New_York"),
    "BATS": ("Cboe BZX U.S. Equities Exchange", "United States", "USD", "America/New_York"),
    "OTCM": ("OTC Markets Group", "United States", "USD", "America/New_York"),
    "XLON": ("London Stock Exchange", "United Kingdom", "GBP", "Europe/London"),
    "XJPX": ("Tokyo Stock Exchange", "Japan", "JPY", "Asia/Tokyo"),
    "XSWX": ("SIX Swiss Exchange", "Switzerland", "CHF", "Europe/Zurich"),
    "XFRA": ("Deutsche Börse XETRA", "Germany", "EUR", "Europe/Berlin"),
    "XPAR": ("Euronext Paris", "France", "EUR", "Europe/Paris"),
    "XAMS": ("Euronext Amsterdam", "Netherlands", "EUR", "Europe/Amsterdam"),
    "XHKG": ("Hong Kong Exchanges", "Hong Kong", "HKD", "Asia/Hong_Kong"),
    "XTSE": ("Toronto Stock Exchange", "Canada", "CAD", "America/Toronto"),
    "XTAI": ("Taiwan Stock Exchange", "Taiwan", "TWD", "Asia/Taipei"),
}

# Curated Institutional Universe covering Global Leaders & Cross-Listed ADRs
CURATED_GLOBAL_STOCKS: List[Dict[str, Any]] = [
    # US Mega-Cap Tech
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001045810", "sector": "Technology", "industry": "Semiconductors"},
    {"symbol": "AAPL", "name": "Apple Inc.", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000320193", "sector": "Technology", "industry": "Consumer Electronics"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000789019", "sector": "Technology", "industry": "Software - Infrastructure"},
    {"symbol": "GOOGL", "name": "Alphabet Inc. (Class A)", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001652044", "sector": "Communication Services", "industry": "Internet Content & Information"},
    {"symbol": "GOOG", "name": "Alphabet Inc. (Class C)", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Secondary", "is_adr": False, "cik": "0001652044", "sector": "Communication Services", "industry": "Internet Content & Information"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001018724", "sector": "Consumer Cyclical", "industry": "Internet Retail"},
    {"symbol": "META", "name": "Meta Platforms Inc.", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001326801", "sector": "Communication Services", "industry": "Internet Content & Information"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001318605", "sector": "Consumer Cyclical", "industry": "Auto Manufacturers"},
    {"symbol": "AMD", "name": "Advanced Micro Devices Inc.", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000002488", "sector": "Technology", "industry": "Semiconductors"},
    {"symbol": "AVGO", "name": "Broadcom Inc.", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001730168", "sector": "Technology", "industry": "Semiconductors"},
    {"symbol": "QCOM", "name": "QUALCOMM Incorporated", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000804328", "sector": "Technology", "industry": "Semiconductors"},
    {"symbol": "INTC", "name": "Intel Corporation", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000050863", "sector": "Technology", "industry": "Semiconductors"},
    {"symbol": "CSCO", "name": "Cisco Systems Inc.", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000858877", "sector": "Technology", "industry": "Communication Equipment"},
    {"symbol": "CRM", "name": "Salesforce Inc.", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001108524", "sector": "Technology", "industry": "Software - Application"},
    {"symbol": "ORCL", "name": "Oracle Corporation", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001341439", "sector": "Technology", "industry": "Software - Infrastructure"},
    {"symbol": "IBM", "name": "International Business Machines", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000051143", "sector": "Technology", "industry": "Information Technology Services"},
    {"symbol": "PLTR", "name": "Palantir Technologies Inc.", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001321655", "sector": "Technology", "industry": "Software - Infrastructure"},
    
    # US Finance & Industrial Leaders
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000019617", "sector": "Financial Services", "industry": "Banks - Diversified"},
    {"symbol": "BAC", "name": "Bank of America Corporation", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000070858", "sector": "Financial Services", "industry": "Banks - Diversified"},
    {"symbol": "GS", "name": "The Goldman Sachs Group Inc.", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000886982", "sector": "Financial Services", "industry": "Capital Markets"},
    {"symbol": "MS", "name": "Morgan Stanley", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000895421", "sector": "Financial Services", "industry": "Capital Markets"},
    {"symbol": "BLK", "name": "BlackRock Inc.", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001364742", "sector": "Financial Services", "industry": "Asset Management"},
    {"symbol": "V", "name": "Visa Inc.", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001403161", "sector": "Financial Services", "industry": "Credit Services"},
    {"symbol": "MA", "name": "Mastercard Incorporated", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001141391", "sector": "Financial Services", "industry": "Credit Services"},
    {"symbol": "BRK.B", "name": "Berkshire Hathaway Inc.", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0001067983", "sector": "Financial Services", "industry": "Insurance - Diversified"},
    {"symbol": "CAT", "name": "Caterpillar Inc.", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000018230", "sector": "Industrials", "industry": "Farm & Heavy Construction Machinery"},
    {"symbol": "GE", "name": "GE Aerospace", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000040545", "sector": "Industrials", "industry": "Aerospace & Defense"},
    {"symbol": "BA", "name": "The Boeing Company", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000012927", "sector": "Industrials", "industry": "Aerospace & Defense"},
    {"symbol": "LMT", "name": "Lockheed Martin Corporation", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000936468", "sector": "Industrials", "industry": "Aerospace & Defense"},
    
    # US Healthcare & Consumer
    {"symbol": "LLY", "name": "Eli Lilly and Company", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000059478", "sector": "Healthcare", "industry": "Drug Manufacturers - General"},
    {"symbol": "UNH", "name": "UnitedHealth Group Incorporated", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000731766", "sector": "Healthcare", "industry": "Healthcare Plans"},
    {"symbol": "JNJ", "name": "Johnson & Johnson", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000200406", "sector": "Healthcare", "industry": "Drug Manufacturers - General"},
    {"symbol": "PFE", "name": "Pfizer Inc.", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000078003", "sector": "Healthcare", "industry": "Drug Manufacturers - General"},
    {"symbol": "WMT", "name": "Walmart Inc.", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000104169", "sector": "Consumer Defensive", "industry": "Discount Stores"},
    {"symbol": "COST", "name": "Costco Wholesale Corporation", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000909832", "sector": "Consumer Defensive", "industry": "Discount Stores"},
    {"symbol": "PG", "name": "The Procter & Gamble Company", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000080424", "sector": "Consumer Defensive", "industry": "Household & Personal Products"},
    {"symbol": "KO", "name": "The Coca-Cola Company", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000021344", "sector": "Consumer Defensive", "industry": "Beverages - Non-Alcoholic"},
    {"symbol": "PEP", "name": "PepsiCo Inc.", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000077476", "sector": "Consumer Defensive", "industry": "Beverages - Non-Alcoholic"},
    {"symbol": "MCD", "name": "McDonald's Corporation", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Primary", "is_adr": False, "cik": "0000063908", "sector": "Consumer Cyclical", "industry": "Restaurants"},
    
    # United Kingdom (London Stock Exchange - Primary Listings)
    {"symbol": "HSBA.L", "name": "HSBC Holdings plc", "mic": "XLON", "country": "United Kingdom", "curr": "GBP", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Financial Services", "industry": "Banks - Diversified", "related_adr_symbol": "HSBC"},
    {"symbol": "SHEL.L", "name": "Shell plc", "mic": "XLON", "country": "United Kingdom", "curr": "GBP", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Energy", "industry": "Oil & Gas Integrated", "related_adr_symbol": "SHEL"},
    {"symbol": "AZN.L", "name": "AstraZeneca PLC", "mic": "XLON", "country": "United Kingdom", "curr": "GBP", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Healthcare", "industry": "Drug Manufacturers - General", "related_adr_symbol": "AZN"},
    {"symbol": "ULVR.L", "name": "Unilever PLC", "mic": "XLON", "country": "United Kingdom", "curr": "GBP", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Consumer Defensive", "industry": "Household & Personal Products", "related_adr_symbol": "UL"},
    {"symbol": "BP.L", "name": "BP p.l.c.", "mic": "XLON", "country": "United Kingdom", "curr": "GBP", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Energy", "industry": "Oil & Gas Integrated", "related_adr_symbol": "BP"},
    {"symbol": "GSK.L", "name": "GSK plc", "mic": "XLON", "country": "United Kingdom", "curr": "GBP", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Healthcare", "industry": "Drug Manufacturers - General", "related_adr_symbol": "GSK"},
    {"symbol": "RIO.L", "name": "Rio Tinto Group", "mic": "XLON", "country": "United Kingdom", "curr": "GBP", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Basic Materials", "industry": "Other Industrial Metals & Mining", "related_adr_symbol": "RIO"},
    {"symbol": "DGE.L", "name": "Diageo plc", "mic": "XLON", "country": "United Kingdom", "curr": "GBP", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Consumer Defensive", "industry": "Beverages - Wineries & Distilleries", "related_adr_symbol": "DEO"},

    # Japan (Tokyo Stock Exchange - Primary Listings)
    {"symbol": "7203.T", "name": "Toyota Motor Corporation (Primary)", "mic": "XJPX", "country": "Japan", "curr": "JPY", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Consumer Cyclical", "industry": "Auto Manufacturers", "related_adr_symbol": "TM"},
    {"symbol": "6758.T", "name": "Sony Group Corporation (Primary)", "mic": "XJPX", "country": "Japan", "curr": "JPY", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Technology", "industry": "Consumer Electronics", "related_adr_symbol": "SONY"},
    {"symbol": "8306.T", "name": "Mitsubishi UFJ Financial Group (Primary)", "mic": "XJPX", "country": "Japan", "curr": "JPY", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Financial Services", "industry": "Banks - Diversified", "related_adr_symbol": "MUFG"},
    {"symbol": "9984.T", "name": "SoftBank Group Corp.", "mic": "XJPX", "country": "Japan", "curr": "JPY", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Communication Services", "industry": "Telecom Services", "related_adr_symbol": "SFTBY"},
    {"symbol": "8035.T", "name": "Tokyo Electron Limited", "mic": "XJPX", "country": "Japan", "curr": "JPY", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Technology", "industry": "Semiconductor Equipment & Materials"},
    {"symbol": "6861.T", "name": "Keyence Corporation", "mic": "XJPX", "country": "Japan", "curr": "JPY", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Technology", "industry": "Electronic Components"},

    # Switzerland (SIX Swiss Exchange - Primary Listings)
    {"symbol": "NESN.SW", "name": "Nestlé S.A. (Primary)", "mic": "XSWX", "country": "Switzerland", "curr": "CHF", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Consumer Defensive", "industry": "Packaged Foods", "related_adr_symbol": "NSRGY"},
    {"symbol": "NOVN.SW", "name": "Novartis AG (Primary)", "mic": "XSWX", "country": "Switzerland", "curr": "CHF", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Healthcare", "industry": "Drug Manufacturers - General", "related_adr_symbol": "NVS"},
    {"symbol": "ROG.SW", "name": "Roche Holding AG (Primary)", "mic": "XSWX", "country": "Switzerland", "curr": "CHF", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Healthcare", "industry": "Drug Manufacturers - General", "related_adr_symbol": "RHHBY"},
    {"symbol": "UBSG.SW", "name": "UBS Group AG (Primary)", "mic": "XSWX", "country": "Switzerland", "curr": "CHF", "type": "Common Stock", "listing": "Primary", "is_adr": False, "sector": "Financial Services", "industry": "Banks - Diversified", "related_adr_symbol": "UBS"},

    # US-Listed International ADRs & Dual Listings (Explicitly Preserved & Distinct)
    {"symbol": "TM", "name": "Toyota Motor Corporation (ADR)", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "ADR", "listing": "ADR", "is_adr": True, "cik": "0001094517", "sector": "Consumer Cyclical", "industry": "Auto Manufacturers", "related_adr_symbol": "7203.T"},
    {"symbol": "NSRGY", "name": "Nestlé S.A. (Sponsored ADR)", "mic": "OTCM", "country": "United States", "curr": "USD", "type": "ADR", "listing": "ADR", "is_adr": True, "sector": "Consumer Defensive", "industry": "Packaged Foods", "related_adr_symbol": "NESN.SW"},
    {"symbol": "SONY", "name": "Sony Group Corporation (ADR)", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "ADR", "listing": "ADR", "is_adr": True, "cik": "0000091440", "sector": "Technology", "industry": "Consumer Electronics", "related_adr_symbol": "6758.T"},
    {"symbol": "MUFG", "name": "Mitsubishi UFJ Financial Group (ADR)", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "ADR", "listing": "ADR", "is_adr": True, "cik": "0001140470", "sector": "Financial Services", "industry": "Banks - Diversified", "related_adr_symbol": "8306.T"},
    {"symbol": "ASML", "name": "ASML Holding N.V. (Nasdaq Listing)", "mic": "XNGS", "country": "United States", "curr": "USD", "type": "Common Stock", "listing": "Dual", "is_adr": False, "cik": "0000937966", "sector": "Technology", "industry": "Semiconductor Equipment & Materials"},
    {"symbol": "TSM", "name": "Taiwan Semiconductor Manufacturing (ADR)", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "ADR", "listing": "ADR", "is_adr": True, "cik": "0001046179", "sector": "Technology", "industry": "Semiconductors"},
    {"symbol": "NVO", "name": "Novo Nordisk A/S (ADR)", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "ADR", "listing": "ADR", "is_adr": True, "cik": "0000353278", "sector": "Healthcare", "industry": "Biotechnology"},
    {"symbol": "BABA", "name": "Alibaba Group Holding Limited (ADR)", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "ADR", "listing": "ADR", "is_adr": True, "cik": "0001577552", "sector": "Consumer Cyclical", "industry": "Internet Retail"},
    {"symbol": "SAP", "name": "SAP SE (ADR)", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "ADR", "listing": "ADR", "is_adr": True, "cik": "0001000184", "sector": "Technology", "industry": "Software - Application"},
    {"symbol": "SHEL", "name": "Shell plc (ADR)", "mic": "XNYS", "country": "United States", "curr": "USD", "type": "ADR", "listing": "ADR", "is_adr": True, "cik": "0001306965", "sector": "Energy", "industry": "Oil & Gas Integrated", "related_adr_symbol": "SHEL.L"},
]

class CatalogSyncService:
    """Institutional Synchronization Engine for Global Stock Catalogues."""

    async def ensure_exchanges(self) -> int:
        """Seeds canonical global exchanges into the database if missing."""
        seeded = 0
        async with async_session_factory() as session:
            for mic, (name, country, curr, tz) in CANONICAL_EXCHANGES.items():
                res = await session.execute(select(Exchange).where(Exchange.mic_code == mic))
                if not res.scalars().first():
                    session.add(Exchange(
                        mic_code=mic,
                        name=name,
                        country=country,
                        currency=curr,
                        timezone=tz
                    ))
                    seeded += 1
            if seeded > 0:
                await session.commit()
                logger.info("Seeded %d global exchanges into database.", seeded)
        return seeded

    async def sync_curated_universe(self) -> int:
        """Upserts the curated institutional global universe into the database."""
        await self.ensure_exchanges()
        inserted = 0

        async with async_session_factory() as session:
            res = await session.execute(select(Instrument.symbol))
            existing_symbols = {s.upper() for s in res.scalars().all()}

            for item in CURATED_GLOBAL_STOCKS:
                sym = item["symbol"].upper()
                if sym not in existing_symbols:
                    inst = Instrument(
                        id=f"inst-{sym.lower().replace('.', '-')}-{item['mic'].lower()}",
                        symbol=item["symbol"],
                        exchange_mic=item["mic"],
                        company_name=item["name"],
                        asset_type=item["type"],
                        listing_type=item.get("listing", "Primary"),
                        trading_currency=item["curr"],
                        country=item.get("country", "United States"),
                        is_adr=item.get("is_adr", False),
                        related_adr_symbol=item.get("related_adr_symbol"),
                        cik=item.get("cik"),
                        sector=item.get("sector"),
                        industry=item.get("industry"),
                        is_active=True,
                        provider_symbols=json.dumps({
                            "twelve_data": sym.split(".")[0],
                            "fmp": sym,
                            "alpha_vantage": sym
                        }),
                        provider_availability=json.dumps({
                            "quote": True,
                            "history": True,
                            "fundamentals": True,
                            "news": True,
                            "technicals": True
                        })
                    )
                    session.add(inst)
                    inserted += 1

            if inserted > 0:
                await session.commit()
                logger.info("Synchronized %d curated institutional instruments into database.", inserted)

        return inserted

    async def sync_sec_edgar_tickers(self, max_records: int = 2500) -> int:
        """
        Synchronizes US publicly traded companies from the official SEC EDGAR registry.
        Endpoint: https://www.sec.gov/files/company_tickers.json
        """
        await self.ensure_exchanges()
        headers = {"User-Agent": settings.SEC_EDGAR_USER_AGENT}
        logger.info("Initiating SEC EDGAR company tickers synchronization...")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get("https://www.sec.gov/files/company_tickers.json", headers=headers)
                if resp.status_code != 200:
                    logger.warning("SEC EDGAR ticker sync failed with HTTP %d: %s", resp.status_code, resp.text[:200])
                    return 0
                data = resp.json()
        except Exception as e:
            logger.warning("Network failure during SEC EDGAR ticker download: %s", e)
            return 0

        total_available = len(data)
        logger.info("SEC EDGAR returned %d company records. Ingesting up to %d...", total_available, max_records)

        inserted = 0
        async with async_session_factory() as session:
            res = await session.execute(select(Instrument.symbol))
            existing_symbols = {s.upper() for s in res.scalars().all()}

            batch_count = 0
            for idx, entry in data.items():
                if inserted >= max_records:
                    break

                raw_ticker = entry.get("ticker", "").strip().upper()
                title = entry.get("title", "").strip()
                cik_int = entry.get("cik_str")
                cik_formatted = str(cik_int).zfill(10) if cik_int else None

                if not raw_ticker or raw_ticker in existing_symbols:
                    continue

                inst = Instrument(
                    id=f"inst-sec-{raw_ticker.lower()}",
                    symbol=raw_ticker,
                    exchange_mic="XNGS" if len(raw_ticker) >= 4 else "XNYS",
                    company_name=title or raw_ticker,
                    asset_type="Common Stock",
                    listing_type="Primary",
                    trading_currency="USD",
                    country="United States",
                    is_adr=False,
                    cik=cik_formatted,
                    is_active=True,
                    provider_symbols=json.dumps({
                        "sec_edgar": cik_formatted or raw_ticker,
                        "twelve_data": raw_ticker,
                        "fmp": raw_ticker,
                        "alpha_vantage": raw_ticker
                    }),
                    provider_availability=json.dumps({
                        "quote": True,
                        "history": True,
                        "fundamentals": True,
                        "news": True,
                        "technicals": True
                    })
                )
                session.add(inst)
                existing_symbols.add(raw_ticker)
                inserted += 1
                batch_count += 1

                if batch_count >= 500:
                    await session.commit()
                    batch_count = 0

            if batch_count > 0:
                await session.commit()

        logger.info("Successfully ingested %d new instruments from SEC EDGAR.", inserted)
        return inserted

    async def get_catalogue_statistics(self) -> Dict[str, Any]:
        """Calculates precise breakdown of the synchronized database catalog."""
        async with async_session_factory() as session:
            # Total count
            total_res = await session.execute(select(func.count(Instrument.id)))
            total_count = total_res.scalar() or 0

            # Count by exchange
            ex_res = await session.execute(
                select(Instrument.exchange_mic, func.count(Instrument.id))
                .group_by(Instrument.exchange_mic)
            )
            by_exchange = {row[0]: row[1] for row in ex_res.all()}

            # Count by country
            country_res = await session.execute(
                select(Instrument.country, func.count(Instrument.id))
                .group_by(Instrument.country)
            )
            by_country = {row[0]: row[1] for row in country_res.all()}

            # Count by asset type
            type_res = await session.execute(
                select(Instrument.asset_type, func.count(Instrument.id))
                .group_by(Instrument.asset_type)
            )
            by_type = {row[0]: row[1] for row in type_res.all()}

            # ADRs count
            adr_res = await session.execute(
                select(func.count(Instrument.id)).where(Instrument.is_adr == True)
            )
            adr_count = adr_res.scalar() or 0

            return {
                "total_instruments": total_count,
                "by_exchange": by_exchange,
                "by_country": by_country,
                "by_asset_type": by_type,
                "adr_count": adr_count,
                "quote_support_count": total_count,
                "history_support_count": total_count,
                "fundamentals_support_count": total_count,
                "news_support_count": total_count,
                "technicals_support_count": total_count,
                "last_synchronized": datetime.now(timezone.utc).isoformat()
            }

catalog_sync_service = CatalogSyncService()
