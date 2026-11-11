"""
Unit Tests for Catalogue Statistics and Resilience
Verifies behaviour for populated database, empty database (0 count),
and database unavailable (session exception with curated fallback).
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from httpx import AsyncClient, ASGITransport
from src.backend.main import app
from src.backend.services.catalog_sync_service import CatalogSyncService

@pytest.mark.asyncio
async def test_catalogue_stats_populated_db():
    service = CatalogSyncService()
    # Test fallback directly if db empty or test normal return
    stats = await service.get_catalogue_statistics()
    assert "total_instruments" in stats
    assert "total_exchanges" in stats
    assert "primary_listings" in stats
    assert "adr_listings" in stats
    assert "timestamp_utc" in stats
    assert stats["total_instruments"] >= 0

@pytest.mark.asyncio
async def test_catalogue_stats_empty_db():
    """Verify that an explicitly empty DB returns 0 totals, not curated fallback."""
    service = CatalogSyncService()
    
    mock_session = AsyncMock()
    # Mock count query returning 0
    mock_total_res = MagicMock()
    mock_total_res.scalar.return_value = 0
    mock_session.execute.return_value = mock_total_res

    mock_factory = MagicMock()
    mock_factory.return_value.__aenter__.return_value = mock_session

    with patch("src.backend.services.catalog_sync_service.async_session_factory", mock_factory):
        stats = await service.get_catalogue_statistics()
        assert stats["total_instruments"] == 0
        assert stats["total_exchanges"] == 0
        assert stats["primary_listings"] == 0
        assert stats["adr_listings"] == 0
        assert stats["active_instruments"] == 0
        assert stats["by_exchange"] == {}
        assert stats["by_country"] == {}

@pytest.mark.asyncio
async def test_catalogue_stats_db_failure_fallback():
    """Verify that DB exception gracefully degrades to curated fallback without HTTP 500."""
    service = CatalogSyncService()
    
    mock_factory = MagicMock(side_effect=RuntimeError("Database connection lost"))

    with patch("src.backend.services.catalog_sync_service.async_session_factory", mock_factory):
        stats = await service.get_catalogue_statistics()
        assert stats["total_instruments"] > 0
        assert stats["total_exchanges"] > 0
        assert "timestamp_utc" in stats

@pytest.mark.asyncio
async def test_catalogue_stats_endpoint_e2e_resilience():
    """API endpoint returns 200 even under complete DB failure."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with patch("src.backend.services.catalog_sync_service.async_session_factory", side_effect=Exception("DB Down")):
            res = await ac.get("/api/v1/market/instruments/stats")
            assert res.status_code == 200
            data = res.json()
            assert data["total_instruments"] > 0
            assert data["total_exchanges"] > 0
