"""
Unit Tests for Financial Normalization and Ratio Serialization
Verifies Decimal serialization, zero division safety, missing fields,
and non-applicable ratios (e.g. negative EPS / unprofitable).
"""
import pytest
from decimal import Decimal
from src.backend.services.fundamental_service import FinancialRatios, fundamental_service
from src.backend.data_ingestion.base import NormalizedFinancialStatement
from datetime import date

def test_financial_ratios_json_serialization():
    ratios = FinancialRatios(
        gross_margin_percent=Decimal("62.50"),
        net_margin_percent=Decimal("25.30"),
        return_on_equity_percent=Decimal("31.25"),
        return_on_assets_percent=Decimal("12.40"),
        debt_to_equity_ratio=Decimal("0.45"),
        current_ratio=Decimal("1.85"),
        pe_ratio=Decimal("28.40"),
        free_cash_flow=Decimal("1500000000"),
        eps=Decimal("4.50"),
        gross_margin=Decimal("62.50"),
        roe=Decimal("31.25"),
        roa=Decimal("12.40"),
        debt_to_equity=Decimal("0.45")
    )
    
    dumped = ratios.model_dump(mode="json")
    # Verify values serialize to numbers/floats in JSON, NOT strings
    assert isinstance(dumped["pe_ratio"], float)
    assert dumped["pe_ratio"] == 28.40
    assert isinstance(dumped["gross_margin_percent"], float)
    assert dumped["gross_margin_percent"] == 62.50
    assert isinstance(dumped["free_cash_flow"], float)
    assert dumped["free_cash_flow"] == 1500000000.0

def test_financial_ratios_unprofitable_negative_eps():
    """When EPS <= 0, P/E ratio is financially not applicable (None), not negative."""
    income = NormalizedFinancialStatement(
        symbol="GROWTH",
        statement_type="INCOME",
        fiscal_period="FY",
        fiscal_year=2025,
        filing_date=date(2025, 3, 1),
        reported_currency="USD",
        source="mock",
        metrics={"revenue": 500000, "grossProfit": 200000, "netIncome": -100000, "eps": -1.5}
    )
    ratios = fundamental_service.calculate_ratios(
        income=income,
        balance=None,
        cash_flow=None,
        current_price=Decimal("45.00")
    )
    assert ratios.pe_ratio is None
    dumped = ratios.model_dump(mode="json")
    assert dumped["pe_ratio"] is None

def test_financial_ratios_null_and_missing_safety():
    """Verify empty/missing statements don't throw and produce None values."""
    ratios = fundamental_service.calculate_ratios(
        income=None,
        balance=None,
        cash_flow=None,
        current_price=None
    )
    assert ratios.pe_ratio is None
    assert ratios.gross_margin_percent is None
    assert ratios.current_ratio is None
    dumped = ratios.model_dump(mode="json")
    assert dumped["pe_ratio"] is None
