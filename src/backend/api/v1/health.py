"""
System Health & Telemetry Endpoints
"""
from fastapi import APIRouter, status
from pydantic import BaseModel
from datetime import datetime, timezone
from src.backend.core.config import settings

router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str
    timestamp_utc: str
    configured_providers: dict[str, bool]

@router.get("", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def check_health() -> HealthResponse:
    """
    Returns API health status and provider configuration state (without revealing secret values).
    """
    return HealthResponse(
        status="HEALTHY",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
        configured_providers={
            "alpha_vantage": bool(settings.ALPHA_VANTAGE_API_KEY and settings.ALPHA_VANTAGE_API_KEY.get_secret_value()),
            "twelve_data": bool(settings.TWELVE_DATA_API_KEY and settings.TWELVE_DATA_API_KEY.get_secret_value()),
            "fmp": bool(settings.FMP_API_KEY and settings.FMP_API_KEY.get_secret_value()),
            "newsapi": bool(settings.NEWSAPI_API_KEY and settings.NEWSAPI_API_KEY.get_secret_value()),
            "nasdaq_data_link": bool(settings.NASDAQ_DATA_LINK_API_KEY and settings.NASDAQ_DATA_LINK_API_KEY.get_secret_value()),
            "groq": bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY.get_secret_value()),
            "sec_edgar": True  # Public API without key
        }
    )
