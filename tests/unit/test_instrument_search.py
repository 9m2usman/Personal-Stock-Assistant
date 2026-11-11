"""
Unit Tests for Unified Instrument Search & Multi-Exchange Resolution
Verifies searching by ticker, company, exchange, country, type, and watchlist aggregation.
"""
import pytest
from src.backend.services.instrument_service import instrument_service, INSTITUTIONAL_UNIVERSE
from src.backend.data_ingestion.base import NormalizedInstrument

def test_canonical_universe_coverage():
    """Verify universe contains major US equities, UK LSE, Tokyo, and Swiss listings."""
    symbols = {item["display_symbol"] for item in INSTITUTIONAL_UNIVERSE}
    # US
    for us_sym in ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "AMD", "AVGO", "JPM"]:
        assert us_sym in symbols, f"Missing US symbol {us_sym}"
    # International Primary
    assert "HSBA.L" in symbols
    assert "7203.T" in symbols
    assert "NESN.SW" in symbols
    # ADRs
    assert "TM" in symbols
    assert "NSRGY" in symbols

@pytest.mark.asyncio
async def test_search_by_ticker():
    """Verify search by ticker symbol returns exact match first."""
    res = await instrument_service.search("NVDA")
    assert len(res) > 0
    assert res[0].display_symbol == "NVDA"
    assert res[0].company_name == "NVIDIA Corporation"
    assert res[0].exchange_mic == "XNGS"

@pytest.mark.asyncio
async def test_search_by_company_name():
    """Verify search by company name resolves correctly."""
    res_apple = await instrument_service.search("Apple")
    assert any(r.display_symbol == "AAPL" for r in res_apple)

    res_toyota = await instrument_service.search("Toyota")
    # Must preserve primary listing and ADR without conflation
    symbols = [r.display_symbol for r in res_toyota]
    assert "7203.T" in symbols
    assert "TM" in symbols

@pytest.mark.asyncio
async def test_search_by_exchange_and_country():
    """Verify filtering and search by exchange code and country."""
    res_lse = await instrument_service.search("HSBC", exchange="XLON")
    assert len(res_lse) >= 1
    assert res_lse[0].display_symbol == "HSBA.L"
    assert res_lse[0].country == "United Kingdom"
    assert res_lse[0].currency == "GBP"

@pytest.mark.asyncio
async def test_adr_preservation_not_silent_substitution():
    """Verify that primary listings are not silently mutated into ADRs."""
    inst_toyota_primary = instrument_service.get_by_symbol("7203.T")
    assert inst_toyota_primary is not None
    assert inst_toyota_primary.display_symbol == "7203.T"
    assert inst_toyota_primary.is_adr is False
    assert inst_toyota_primary.exchange_mic == "XJPX"
    assert inst_toyota_primary.related_adr_symbol == "TM"

    inst_toyota_adr = instrument_service.get_by_symbol("TM")
    assert inst_toyota_adr is not None
    assert inst_toyota_adr.display_symbol == "TM"
    assert inst_toyota_adr.is_adr is True
    assert inst_toyota_adr.exchange_mic == "XNYS"

@pytest.mark.asyncio
async def test_watchlist_structure():
    """Verify default watchlist returns structured items with freshness and provider."""
    watchlist = await instrument_service.get_watchlist()
    assert len(watchlist) >= 6
    symbols = [item["symbol"] for item in watchlist]
    assert "NVDA" in symbols
    assert "AAPL" in symbols
    assert "MSFT" in symbols
    for item in watchlist:
        assert "symbol" in item
        assert "company_name" in item
        assert "currency" in item
        assert "freshness" in item
        assert "provider" in item
