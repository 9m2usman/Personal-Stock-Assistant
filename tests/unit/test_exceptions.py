"""
Unit Tests for Custom Financial Exceptions & Error Handlers
"""
import pytest
from src.backend.core.exceptions import (
    InstrumentNotFoundError,
    ProviderRateLimitError,
    ProviderTierRestrictionError,
    CurrencyMismatchError,
    financial_exception_handler
)
from fastapi import Request

@pytest.mark.asyncio
async def test_instrument_not_found_exception():
    """Verify 404 response payload on unresolved ticker."""
    exc = InstrumentNotFoundError("UNKNOWN_TICKER")
    resp = await financial_exception_handler(None, exc)
    assert resp.status_code == 404
    import json
    data = json.loads(resp.body.decode())
    assert data["success"] is False
    assert data["error"]["code"] == "INSTRUMENT_NOT_FOUND"
    assert "UNKNOWN_TICKER" in data["error"]["message"]

@pytest.mark.asyncio
async def test_provider_tier_restriction_exception():
    """Verify 402 response payload on paid tier requirements."""
    exc = ProviderTierRestrictionError("twelve_data", "NESN", "Pro Plan ($229/mo)")
    resp = await financial_exception_handler(None, exc)
    assert resp.status_code == 402
    import json
    data = json.loads(resp.body.decode())
    assert data["error"]["code"] == "PROVIDER_TIER_RESTRICTION"
    assert data["error"]["details"]["required_plan"] == "Pro Plan ($229/mo)"

@pytest.mark.asyncio
async def test_currency_mismatch_exception():
    """Verify 400 response on unhedged cross-currency operations."""
    exc = CurrencyMismatchError("USD", "JPY")
    resp = await financial_exception_handler(None, exc)
    assert resp.status_code == 400
    import json
    data = json.loads(resp.body.decode())
    assert data["error"]["code"] == "CURRENCY_MISMATCH"
    assert data["error"]["details"]["source_currency"] == "USD"
