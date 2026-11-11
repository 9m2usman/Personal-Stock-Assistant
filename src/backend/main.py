"""
AI Stock Market Assistant - FastAPI Application Factory
"""
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from src.backend.core.config import settings
from src.backend.core.logging import logger
from src.backend.core.database import Base, async_engine
from src.backend.core.exceptions import BaseFinancialAssistantException, financial_exception_handler
import src.backend.models  # Register all ORM entities with Base.metadata
from src.backend.api.v1 import api_v1_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events: database table initialization and shutdown."""
    logger.info("Initializing %s (v%s) in %s mode...", settings.APP_NAME, settings.APP_VERSION, settings.ENVIRONMENT)
    try:
        # Initialize tables dynamically for local development
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.warning("Database schema auto-creation skipped or deferred: %s", e)

    providers = {
        "Alpha Vantage": bool(settings.ALPHA_VANTAGE_API_KEY),
        "Twelve Data": bool(settings.TWELVE_DATA_API_KEY),
        "FMP": bool(settings.FMP_API_KEY),
        "NewsAPI": bool(settings.NEWSAPI_API_KEY),
        "Nasdaq Data Link": bool(settings.NASDAQ_DATA_LINK_API_KEY),
        "SEC EDGAR": True
    }
    logger.info("Configured Providers: %s", providers)
    yield
    logger.info("Disposing database connections...")
    await async_engine.dispose()
    logger.info("Shutting down %s...", settings.APP_NAME)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Institutional-grade AI-powered financial research, stock analysis, and portfolio platform.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Exception Handlers
app.add_exception_handler(BaseFinancialAssistantException, financial_exception_handler)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

@app.get("/health", status_code=status.HTTP_200_OK, tags=["System Health"])
async def root_health():
    """Root healthcheck endpoint."""
    return {
        "status": "OK",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/", status_code=status.HTTP_200_OK, tags=["System Health"])
async def root():
    """Root metadata endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "api_v1": settings.API_V1_PREFIX
    }
