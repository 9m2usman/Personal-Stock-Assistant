"""
Exchange & Financial Instrument Entities
"""
import uuid
from typing import Optional, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, ForeignKey
from src.backend.core.database import Base, TimestampMixin

class Exchange(Base, TimestampMixin):
    __tablename__ = "exchanges"

    mic_code: Mapped[str] = mapped_column(String(10), primary_key=True)  # ISO 10383 MIC Code (e.g. XNGS, XLON)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(50), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)    # Base settlement currency
    timezone: Mapped[str] = mapped_column(String(50), nullable=False)

    # Relationships
    instruments = relationship("Instrument", back_populates="exchange")

class Instrument(Base, TimestampMixin):
    __tablename__ = "instruments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    symbol: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    exchange_mic: Mapped[str] = mapped_column(String(10), ForeignKey("exchanges.mic_code"), nullable=False)
    company_name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    asset_type: Mapped[str] = mapped_column(String(50), default="Common Stock")
    trading_currency: Mapped[str] = mapped_column(String(10), nullable=False)
    is_adr: Mapped[bool] = mapped_column(Boolean, default=False)
    cik: Mapped[Optional[str]] = mapped_column(String(20), index=True, nullable=True)  # SEC EDGAR Central Index Key

    # Relationships
    exchange = relationship("Exchange", back_populates="instruments")
    daily_prices = relationship("DailyPrice", back_populates="instrument", cascade="all, delete-orphan")
    financial_statements = relationship("FinancialStatement", back_populates="instrument", cascade="all, delete-orphan")
    holdings = relationship("Holding", back_populates="instrument")
