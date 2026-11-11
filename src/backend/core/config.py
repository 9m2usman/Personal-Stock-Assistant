"""
System Configuration & Environment Settings
Validates environment variables securely using Pydantic Settings.
"""
from typing import List, Optional
from pydantic import SecretStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    # Application Metadata
    APP_NAME: str = "AI Stock Market Assistant"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "insecure-dev-secret-key-change-in-production-only"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database & Storage
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./fintech_market.db",
        description="Async database connection string. Defaults to local SQLite for development."
    )
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]

    # Financial Data Provider Credentials (SecretStr prevents accidental leakage in logs/repr)
    ALPHA_VANTAGE_API_KEY: Optional[SecretStr] = None
    TWELVE_DATA_API_KEY: Optional[SecretStr] = None
    FMP_API_KEY: Optional[SecretStr] = None
    NEWSAPI_API_KEY: Optional[SecretStr] = None
    NASDAQ_DATA_LINK_API_KEY: Optional[SecretStr] = None

    # SEC EDGAR Fair-Access User-Agent
    SEC_EDGAR_USER_AGENT: str = "InkVectorResearch/1.0 (contact@inkvector.com; Academic & Financial Research)"

    model_config = SettingsConfigDict(
        env_file=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")),
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Global settings instance
settings = Settings()
