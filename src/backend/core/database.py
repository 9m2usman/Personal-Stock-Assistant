"""
Async Database Engine & Declarative Base
Supports PostgreSQL (asyncpg) for production and SQLite (aiosqlite) for zero-friction local development.
"""
from typing import AsyncGenerator
from datetime import datetime, timezone
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import DateTime, String
from src.backend.core.config import settings

# Engine configuration
engine_kwargs = {"echo": False}
if "sqlite" in settings.DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

async_engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    """Base declarative class for all financial entities."""
    pass

class TimestampMixin:
    """Standard audit timestamps for all persisted records."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI async dependency yielding an active database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
