"""
Celery Worker Configuration
Supports distributed task queues backed by Redis, with transparent local eager-mode fallback.
"""
from celery import Celery
from src.backend.core.config import settings
from src.backend.core.logging import logger

# Redis broker / result backend URL
REDIS_URL = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "personal_stock_assistant",
    broker=REDIS_URL,
    backend=REDIS_URL,
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
    # If in local development or test without active Redis server,
    # Celery can run tasks eagerly in the same thread.
    task_always_eager=getattr(settings, "CELERY_TASK_ALWAYS_EAGER", True)
)

logger.info("Celery worker configured. Eager mode: %s", celery_app.conf.task_always_eager)
