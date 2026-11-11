"""
Celery Worker Configuration
Supports distributed task queues backed by Redis with RESP2 Windows compatibility,
REFRESH_BINDING compatibility for Redis 5/6/7/8, and transparent local eager-mode fallback.
"""
from celery import Celery
import socket
import redis.connection
import redis.client
from redis.connection import MaintNotificationsConfig

# Apply transparent RESP2 protocol compatibility for Windows Redis
_orig_pool_init = redis.connection.ConnectionPool.__init__
def _compat_pool_init(self, *args, **kwargs):
    kwargs["maint_notifications_config"] = MaintNotificationsConfig(enabled=False)
    kwargs["protocol"] = 2
    return _orig_pool_init(self, *args, **kwargs)
redis.connection.ConnectionPool.__init__ = _compat_pool_init

_orig_conn_init = redis.connection.Connection.__init__
def _compat_conn_init(self, *args, **kwargs):
    kwargs.setdefault("protocol", 2)
    kwargs.setdefault("maint_notifications_config", None)
    return _orig_conn_init(self, *args, **kwargs)
redis.connection.Connection.__init__ = _compat_conn_init

# Apply ZRANGE BYSCORE compatibility for Redis 5.x
_orig_zrange = redis.client.Redis.zrange
def _compat_zrange(self, name, start, end, **kwargs):
    if kwargs.get("byscore"):
        offset = kwargs.get("offset")
        num = kwargs.get("num")
        withscores = kwargs.get("withscores", False)
        if kwargs.get("desc"):
            return self.zrevrangebyscore(name, start, end, start=offset, num=num, withscores=withscores)
        else:
            return self.zrangebyscore(name, start, end, start=offset, num=num, withscores=withscores)
    return _orig_zrange(self, name, start, end, **kwargs)
redis.client.Redis.zrange = _compat_zrange

# Apply Lua script compatibility for Redis 5.x (remove 'GT' parameter from ZADD)
import kombu.transport.redis
kombu.transport.redis.REFRESH_BINDING = """
redis.call('SADD', KEYS[1], ARGV[1])
local now = redis.call('TIME')
local ms = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
redis.call('ZADD', KEYS[2], ms + tonumber(ARGV[3]), ARGV[2])
"""

from src.backend.core.config import settings
from src.backend.core.logging import logger

def is_redis_available(host: str = "127.0.0.1", port: int = 6379, timeout: float = 0.5) -> bool:
    """Checks whether Redis is actively listening on the target port."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.error, OSError):
        return False

# Detect Redis status
REDIS_LIVE = is_redis_available()

# Redis broker / result backend URLs using separate logical DBs
BROKER_URL = "redis://127.0.0.1:6379/1" if REDIS_LIVE else "memory://"
BACKEND_URL = "redis://127.0.0.1:6379/2" if REDIS_LIVE else "cache+memory://"

celery_app = Celery(
    "personal_stock_assistant",
    broker=BROKER_URL,
    backend=BACKEND_URL,
    include=["src.backend.workers.tasks"]
)

# Standard Institutional Celery Configuration
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,        # 5 minutes max per task
    task_soft_time_limit=240,   # 4 minutes soft limit
    result_expires=86400,       # 24 hours result TTL
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_always_eager=not REDIS_LIVE
)

logger.info(
    "Celery worker initialized. Redis Active: %s (Broker: %s, Eager Mode: %s)",
    REDIS_LIVE, BROKER_URL, celery_app.conf.task_always_eager
)
