"""
Unit Tests for Data Ingestion Layer & Provider Router
"""
import pytest
from decimal import Decimal
from datetime import date
from src.backend.data_ingestion.router import FinancialDataRouter
from src.backend.data_ingestion.rate_limiter import TokenBucketRateLimiter
from src.backend.data_ingestion.cache_manager import SimpleTTLCache
from src.backend.data_ingestion.providers.fx_provider import ECBFXProvider
from src.backend.data_ingestion.base import NormalizedBar, DataFreshness

@pytest.mark.asyncio
async def test_rate_limiter_pacing():
    """Verify that TokenBucketRateLimiter throttles according to capacity."""
    limiter = TokenBucketRateLimiter(rate_per_second=100.0, capacity=2.0)
    await limiter.acquire()
    assert limiter.tokens < 2.0

def test_ttl_cache_expiration():
    """Verify in-memory cache get, set, and TTL expiration."""
    cache = SimpleTTLCache()
    cache.set("test_key", "test_value", ttl_seconds=1)
    assert cache.get("test_key") == "test_value"
    # Negative TTL simulates expired entry
    cache.set("expired_key", "old_val", ttl_seconds=-1)
    assert cache.get("expired_key") is None

@pytest.mark.asyncio
async def test_fx_provider_same_currency():
    """Verify identical currency returns rate 1.0 immediately without HTTP."""
    fx = ECBFXProvider()
    rate = await fx.get_rate("USD", "USD")
    assert rate.rate == Decimal("1.000000")
    assert rate.base_currency == "USD"
    assert rate.target_currency == "USD"

def test_router_adr_proxy_mapping():
    """Verify router maps Tokyo and Zurich primary listings to accessible US ADRs."""
    router = FinancialDataRouter()
    assert router.adr_proxies.get("7203") == "TM"
    assert router.adr_proxies.get("7203.T") == "TM"
    assert router.adr_proxies.get("NESN") == "NSRGY"
    assert router.adr_proxies.get("NESN.SW") == "NSRGY"
