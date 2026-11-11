"""
Foreign Exchange (FX) Provider Implementation
Integrates European Central Bank (ECB) reference exchange rates via Frankfurter.
Zero-cost, unmetered, public reference data.
"""
import httpx
from datetime import date
from decimal import Decimal
from src.backend.data_ingestion.base import BaseFXProvider, NormalizedFXRate
from src.backend.data_ingestion.rate_limiter import rate_limiters
from src.backend.data_ingestion.cache_manager import cache
from src.backend.core.logging import logger
from src.backend.core.exceptions import CurrencyMismatchError

class ECBFXProvider(BaseFXProvider):
    """Integrates official European Central Bank reference exchange rates."""
    def __init__(self):
        self.base_url = "https://api.frankfurter.dev/v1"
        self.timeout = 10.0

    @property
    def provider_name(self) -> str:
        return "ecb_frankfurter"

    async def get_rate(self, base_currency: str, target_currency: str) -> NormalizedFXRate:
        base = base_currency.upper()
        target = target_currency.upper()

        if base == target:
            return NormalizedFXRate(
                base_currency=base,
                target_currency=target,
                rate=Decimal("1.000000"),
                date=date.today(),
                source=self.provider_name
            )

        # Handle London pence (GBp) to Pounds (GBP)
        multiplier = Decimal("1.0")
        if base == "GBP" and target == "GBP":
            multiplier = Decimal("0.01")
            base = "GBP"

        cache_key = f"fx_{base}_{target}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        await rate_limiters["fx"].acquire()
        url = f"{self.base_url}/latest"
        params = {"from": base, "to": target}

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    rates = data.get("rates", {})
                    raw_rate = rates.get(target)
                    if raw_rate:
                        rate_val = Decimal(str(raw_rate)) * multiplier
                        fx_rate = NormalizedFXRate(
                            base_currency=base_currency,
                            target_currency=target_currency,
                            rate=rate_val,
                            date=date.fromisoformat(data.get("date", str(date.today()))),
                            source=self.provider_name
                        )
                        cache.set(cache_key, fx_rate, ttl_seconds=3600 * 6)  # Cache FX for 6 hours
                        return fx_rate
            except Exception as e:
                logger.error("FX provider error for %s/%s: %s", base, target, e)

        raise CurrencyMismatchError(base_currency, target_currency)
