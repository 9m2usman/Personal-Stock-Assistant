"""
Unit Tests for Fundamental Analysis Service
Verifies calculation of margins, ROE, ROA, Debt-to-Equity, Current Ratio, P/E, and FCF.
"""
import pytest
from decimal import Decimal
from datetime import date, datetime, timezone
from src.backend.services.fundamental_service import FundamentalAnalysisService, fundamental_service
from src.backend.data_ingestion.base import (
    NormalizedProfile,
    NormalizedFinancialStatement,
    NormalizedQuote
)

def test_calculate_ratios_standard():
    income = NormalizedFinancialStatement(
        symbol="NVDA",
        statement_type="INCOME",
        fiscal_period="FY",
        fiscal_year=2025,
        filing_date=date(2025, 3, 1),
        reported_currency="USD",
        source="mock",
        metrics={
            "revenue": 1000000,
            "grossProfit": 600000,
            "netIncome": 200000,
            "eps": 4.0
        }
    )

    balance = NormalizedFinancialStatement(
        symbol="NVDA",
        statement_type="BALANCE_SHEET",
        fiscal_period="FY",
        fiscal_year=2025,
        filing_date=date(2025, 3, 1),
        reported_currency="USD",
        source="mock",
        metrics={
            "totalAssets": 2000000,
            "totalStockholdersEquity": 1000000,
            "totalDebt": 500000,
            "totalCurrentAssets": 800000,
            "totalCurrentLiabilities": 400000
        }
    )

    cash_flow = NormalizedFinancialStatement(
        symbol="NVDA",
        statement_type="CASH_FLOW",
        fiscal_period="FY",
        fiscal_year=2025,
        filing_date=date(2025, 3, 1),
        reported_currency="USD",
        source="mock",
        metrics={
            "netCashProvidedByOperatingActivities": 300000,
            "capitalExpenditure": 100000,
            "freeCashFlow": 200000
        }
    )

    ratios = fundamental_service.calculate_ratios(
        income=income,
        balance=balance,
        cash_flow=cash_flow,
        current_price=Decimal("100.00")
    )

    assert ratios.gross_margin_percent == Decimal("60.00")
    assert ratios.net_margin_percent == Decimal("20.00")
    assert ratios.return_on_equity_percent == Decimal("20.00")
    assert ratios.return_on_assets_percent == Decimal("10.00")
    assert ratios.debt_to_equity_ratio == Decimal("0.50")
    assert ratios.current_ratio == Decimal("2.00")
    assert ratios.pe_ratio == Decimal("25.00")
    assert ratios.free_cash_flow == Decimal("200000")
    assert ratios.eps == Decimal("4.0")

def test_calculate_ratios_zero_division_safety():
    # Test that zero revenue and zero liabilities do not throw ZeroDivisionError
    income = NormalizedFinancialStatement(
        symbol="TEST",
        statement_type="INCOME",
        fiscal_period="FY",
        fiscal_year=2025,
        filing_date=date(2025, 3, 1),
        reported_currency="USD",
        source="mock",
        metrics={"revenue": 0, "grossProfit": 0, "netIncome": 0, "eps": 0}
    )

    balance = NormalizedFinancialStatement(
        symbol="TEST",
        statement_type="BALANCE_SHEET",
        fiscal_period="FY",
        fiscal_year=2025,
        filing_date=date(2025, 3, 1),
        reported_currency="USD",
        source="mock",
        metrics={
            "totalAssets": 1000,
            "totalStockholdersEquity": 0,
            "totalDebt": 500,
            "totalCurrentAssets": 100,
            "totalCurrentLiabilities": 0
        }
    )

    ratios = fundamental_service.calculate_ratios(income=income, balance=balance)
    assert ratios.gross_margin_percent is None
    assert ratios.net_margin_percent is None
    assert ratios.return_on_equity_percent is None
    assert ratios.debt_to_equity_ratio is None
    assert ratios.current_ratio is None
    assert ratios.pe_ratio is None

@pytest.mark.asyncio
async def test_get_fundamentals_overview():
    class MockRouter:
        async def get_company_profile(self, symbol: str):
            return NormalizedProfile(
                symbol=symbol,
                company_name="NVIDIA Corporation",
                exchange="NASDAQ",
                currency="USD",
                sector="Technology",
                provider="mock"
            )

        async def get_quote(self, symbol: str):
            return NormalizedQuote(
                symbol=symbol,
                price=Decimal("120.00"),
                change=Decimal("2.00"),
                change_percent=Decimal("1.69"),
                currency="USD",
                exchange="NASDAQ",
                as_of=datetime.now(timezone.utc),
                provider="mock"
            )

        async def get_income_statements(self, symbol: str, limit: int = 5):
            return [
                NormalizedFinancialStatement(
                    symbol=symbol,
                    statement_type="INCOME",
                    fiscal_period="FY",
                    fiscal_year=2025,
                    filing_date=date(2025, 3, 1),
                    reported_currency="USD",
                    source="mock",
                    metrics={"revenue": 1000000, "grossProfit": 700000, "netIncome": 400000, "eps": 5.0}
                )
            ]

        async def get_balance_sheets(self, symbol: str, limit: int = 5):
            return []

        async def get_cash_flows(self, symbol: str, limit: int = 5):
            return []

    svc = FundamentalAnalysisService(router=MockRouter())
    overview = await svc.get_fundamentals("NVDA")

    assert overview.symbol == "NVDA"
    assert overview.profile.company_name == "NVIDIA Corporation"
    assert overview.ratios.gross_margin_percent == Decimal("70.00")
    assert overview.ratios.net_margin_percent == Decimal("40.00")
    assert overview.ratios.pe_ratio == Decimal("24.00")  # 120 / 5
