"""
FastAPI Dependency Injection Providers
"""
from typing import Generator
from src.backend.core.config import settings

def get_settings():
    """Provides application settings."""
    return settings
