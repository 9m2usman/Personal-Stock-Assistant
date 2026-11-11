"""
Daily OHLCV & Market Price Entity
"""
import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Date, Numeric, BigInteger, ForeignKey, UniqueConstraint
from src.backend.core.database import Base, TimestampMixin

class DailyPrice(Base, TimestampMixin):
    __tablename__ = "daily_prices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    instrument_id: Mapped[str] = mapped_column(String(36), ForeignKey("instruments.id"), nullable=False, index=True)
    trade_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    open: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    high: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    low: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    close: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    volume: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    freshness: Mapped[str] = mapped_column(String(20), default="END_OF_DAY")

    # Enforce unique constraint per instrument and date
    __table_args__ = (
        UniqueConstraint("instrument_id", "trade_date", name="uq_instrument_trade_date"),
    )

    # Relationships
    instrument = relationship("Instrument", back_populates="daily_prices")
