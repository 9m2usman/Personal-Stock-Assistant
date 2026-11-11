"""
Portfolio & Holding Entities
"""
import uuid
from datetime import date
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Numeric, Date, ForeignKey
from src.backend.core.database import Base, TimestampMixin

class Portfolio(Base, TimestampMixin):
    __tablename__ = "portfolios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    base_currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    user = relationship("User", back_populates="portfolios")
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")

class Holding(Base, TimestampMixin):
    __tablename__ = "holdings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    portfolio_id: Mapped[str] = mapped_column(String(36), ForeignKey("portfolios.id"), nullable=False, index=True)
    instrument_id: Mapped[str] = mapped_column(String(36), ForeignKey("instruments.id"), nullable=False, index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    average_cost_basis: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    acquisition_date: Mapped[date] = mapped_column(Date, nullable=False)
    cost_currency: Mapped[str] = mapped_column(String(10), nullable=False)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="holdings")
    instrument = relationship("Instrument", back_populates="holdings")
