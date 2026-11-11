"""
API v1 Router Definition
"""
from fastapi import APIRouter
from src.backend.api.v1.health import router as health_router
from src.backend.api.v1.market_data import router as market_router
from src.backend.api.v1.fundamentals import router as fundamental_router
from src.backend.api.v1.chat import router as chat_router
from src.backend.api.v1.sandbox import router as sandbox_router
from src.backend.api.v1.jobs import router as jobs_router
from src.backend.api.v1.news import router as news_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router, prefix="/health", tags=["System Health"])
api_v1_router.include_router(market_router, prefix="/market", tags=["Market Data & Technicals"])
api_v1_router.include_router(fundamental_router, prefix="/fundamentals", tags=["Fundamental Analysis"])
api_v1_router.include_router(chat_router, prefix="/chat", tags=["Conversational AI Assistant"])
api_v1_router.include_router(sandbox_router, prefix="/sandbox", tags=["Python Sandbox Execution"])
api_v1_router.include_router(jobs_router, prefix="/jobs", tags=["Asynchronous Task Worker"])
api_v1_router.include_router(news_router, prefix="/news", tags=["News & Sentiment Analysis"])
