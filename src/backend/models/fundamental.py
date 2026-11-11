"""
Corporate Fundamentals & Financial Statements Entity
"""
import uuid
from datetime import date
from typing import Any, Dict
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Date, ForeignKey, JSON
from src.backend.core.database import Base, TimestampMixin

class FinancialStatement(Base, TimestampMixin):
    __tablename__ = "financial_statements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    instrument_id: Mapped[str] = mapped_column(String(36), ForeignKey("instruments.id"), nullable=False, index=True)
    statement_type: Mapped[str] = mapped_column(String(50), nullable=False)  # INCOME, BALANCE_SHEET, CASH_FLOW
    fiscal_period: Mapped[str] = mapped_column(String(20), nullable=False)   # FY, Q1, Q2, Q3, Q4
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    filing_date: Mapped[date] = mapped_column(Date, nullable=False)
    reported_currency: Mapped[str] = mapped_column(String(10), nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)          # SEC_EDGAR_XBRL or FMP_STABLE
    statement_data: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)

    # Relationships
    instrument = relationship("Instrument", back_populates="financial_statements")
