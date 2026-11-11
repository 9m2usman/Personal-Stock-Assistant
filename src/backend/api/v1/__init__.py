"""
API v1 Router Definition
"""
from fastapi import APIRouter
from src.backend.api.v1.health import router as health_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router, prefix="/health", tags=["System Health"])
