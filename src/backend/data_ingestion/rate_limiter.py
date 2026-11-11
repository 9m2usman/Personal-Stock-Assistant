"""
In-Memory Async Token Bucket Rate Limiter
Prevents provider quota exhaustion and 429 throttling.
"""
import asyncio
import time
from typing import Dict

class TokenBucketRateLimiter:
    """
    Enforces maximum request rates per provider using a thread-safe token bucket algorithm.
    """
    def __init__(self, rate_per_second: float, capacity: float):
        self.rate = rate_per_second
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Blocks until a token is available."""
        async with self._lock:
            while True:
                now = time.monotonic()
                elapsed = now - self.last_update
                self.last_update = now
                self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)

                if self.tokens >= 1.0:
                    self.tokens -= 1.0
                    return
                # Wait for token replenishment
                sleep_time = (1.0 - self.tokens) / self.rate
                await asyncio.sleep(sleep_time)

# Pre-configured provider limiters matching validated terms:
# - Twelve Data: 8 calls/min -> ~0.133 req/sec
# - Alpha Vantage: 5 calls/min -> ~0.083 req/sec
# - SEC EDGAR: 10 calls/sec -> 10.0 req/sec
# - FMP: 300 calls/min -> 5.0 req/sec
rate_limiters: Dict[str, TokenBucketRateLimiter] = {
    "twelve_data": TokenBucketRateLimiter(rate_per_second=8.0 / 60.0, capacity=8.0),
    "alpha_vantage": TokenBucketRateLimiter(rate_per_second=5.0 / 60.0, capacity=5.0),
    "fmp": TokenBucketRateLimiter(rate_per_second=5.0, capacity=10.0),
    "sec_edgar": TokenBucketRateLimiter(rate_per_second=10.0, capacity=10.0),
    "newsapi": TokenBucketRateLimiter(rate_per_second=1.0, capacity=5.0),
    "fx": TokenBucketRateLimiter(rate_per_second=5.0, capacity=10.0),
}
