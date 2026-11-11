"""
Exchange & Financial Instrument Entities
Normalized Institutional Instrument Master with Multi-Exchange & ADR Support.
"""
import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, ForeignKey, Text, JSON
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

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    symbol: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    exchange_mic: Mapped[str] = mapped_column(String(10), ForeignKey("exchanges.mic_code"), nullable=False)
    company_name: Mapped[str] = mapped_column(String(250), index=True, nullable=False)
    asset_type: Mapped[str] = mapped_column(String(50), default="Common Stock")
    listing_type: Mapped[str] = mapped_column(String(20), default="Primary")  # Primary, Secondary, ADR, ETF
    trading_currency: Mapped[str] = mapped_column(String(10), nullable=False)
    country: Mapped[str] = mapped_column(String(50), default="United States")
    is_adr: Mapped[bool] = mapped_column(Boolean, default=False)
    related_adr_symbol: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    cik: Mapped[Optional[str]] = mapped_column(String(20), index=True, nullable=True)  # SEC EDGAR Central Index Key
    isin: Mapped[Optional[str]] = mapped_column(String(30), index=True, nullable=True)
    cusip: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sector: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    provider_symbols: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-encoded provider mappings
    provider_availability: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-encoded capabilities

    # Relationships
    exchange = relationship("Exchange", back_populates="instruments")
    daily_prices = relationship("DailyPrice", back_populates="instrument", cascade="all, delete-orphan")
    financial_statements = relationship("FinancialStatement", back_populates="instrument", cascade="all, delete-orphan")
    holdings = relationship("Holding", back_populates="instrument")
