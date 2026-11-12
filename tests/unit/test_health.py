"""
Unit Tests for Health & Telemetry Endpoints
"""
import pytest
from pydantic import SecretStr
from src.backend.main import root, root_health
from src.backend.api.v1.health import check_health
from src.backend.core.config import settings

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
async def test_api_v1_health(monkeypatch):
    """Verify detailed v1 health and provider readiness status."""
    resp = await check_health()
    assert resp.status == "HEALTHY"
    providers = resp.configured_providers
    assert providers["sec_edgar"] is True
    assert "alpha_vantage" in providers
    assert "twelve_data" in providers
    assert "fmp" in providers
    assert "newsapi" in providers
    assert "nasdaq_data_link" in providers

    # Verify that providers report True when configured with API keys
    monkeypatch.setattr(settings, "ALPHA_VANTAGE_API_KEY", SecretStr("test_alpha_key"))
    monkeypatch.setattr(settings, "TWELVE_DATA_API_KEY", SecretStr("test_twelve_key"))
    monkeypatch.setattr(settings, "FMP_API_KEY", SecretStr("test_fmp_key"))
    monkeypatch.setattr(settings, "NEWSAPI_API_KEY", SecretStr("test_news_key"))
    monkeypatch.setattr(settings, "NASDAQ_DATA_LINK_API_KEY", SecretStr("test_nasdaq_key"))

    configured_resp = await check_health()
    assert configured_resp.status == "HEALTHY"
    assert configured_resp.configured_providers["alpha_vantage"] is True
    assert configured_resp.configured_providers["twelve_data"] is True
    assert configured_resp.configured_providers["fmp"] is True
    assert configured_resp.configured_providers["newsapi"] is True
    assert configured_resp.configured_providers["nasdaq_data_link"] is True
    assert configured_resp.configured_providers["sec_edgar"] is True

    # Verify that providers report False when keys are absent
    monkeypatch.setattr(settings, "ALPHA_VANTAGE_API_KEY", None)
    monkeypatch.setattr(settings, "TWELVE_DATA_API_KEY", None)
    monkeypatch.setattr(settings, "FMP_API_KEY", None)
    monkeypatch.setattr(settings, "NEWSAPI_API_KEY", None)
    monkeypatch.setattr(settings, "NASDAQ_DATA_LINK_API_KEY", None)

    unconfigured_resp = await check_health()
    assert unconfigured_resp.status == "HEALTHY"
    assert unconfigured_resp.configured_providers["alpha_vantage"] is False
    assert unconfigured_resp.configured_providers["twelve_data"] is False
    assert unconfigured_resp.configured_providers["fmp"] is False
    assert unconfigured_resp.configured_providers["newsapi"] is False
    assert unconfigured_resp.configured_providers["nasdaq_data_link"] is False
    assert unconfigured_resp.configured_providers["sec_edgar"] is True

