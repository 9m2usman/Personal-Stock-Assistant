"""
Unit Tests for Health & Telemetry Endpoints
"""
import pytest
from src.backend.main import root, root_health
from src.backend.api.v1.health import check_health

@pytest.mark.asyncio
async def test_root_endpoint():
    """Verify root metadata endpoint."""
    resp = await root()
    assert "Welcome" in resp["message"]
    assert resp["docs"] == "/docs"

@pytest.mark.asyncio
async def test_root_health():
    """Verify root health check endpoint."""
    resp = await root_health()
    assert resp["status"] == "OK"

@pytest.mark.asyncio
async def test_api_v1_health():
    """Verify detailed v1 health and provider readiness status."""
    resp = await check_health()
    assert resp.status == "HEALTHY"
    providers = resp.configured_providers
    assert providers["sec_edgar"] is True
    assert providers["alpha_vantage"] is True
    assert providers["twelve_data"] is True
    assert providers["fmp"] is True
    assert providers["newsapi"] is True
