"""
Async In-Memory TTL Cache Manager
Provides fast caching for EOD prices, financial statements, and profile data.
"""
import time
from typing import Any, Optional, Dict, Tuple

class SimpleTTLCache:
    """Thread-safe in-memory cache with Time-To-Live support."""
    def __init__(self):
        self._store: Dict[str, Tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            value, expires_at = self._store[key]
            if time.time() < expires_at:
                return value
            # Expired
            del self._store[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        self._store[key] = (value, time.time() + ttl_seconds)

    def clear(self) -> None:
        self._store.clear()

cache = SimpleTTLCache()
