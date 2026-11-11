"""
API v1 Router Definition
"""
from fastapi import APIRouter
from src.backend.api.v1.health import router as health_router
from src.backend.api.v1.market_data import router as market_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router, prefix="/health", tags=["System Health"])
api_v1_router.include_router(market_router, prefix="/market", tags=["Market Data & Technicals"])
