"""
Fundamental Analysis & Valuation Service
Standardizes 3-statement financial accounting data, SEC EDGAR XBRL facts, and deterministic financial ratio calculations.
"""
from typing import List, Optional, Dict, Any
from decimal import Decimal, InvalidOperation, getcontext
from pydantic import BaseModel
from src.backend.data_ingestion.router import financial_router, FinancialDataRouter
from src.backend.data_ingestion.base import NormalizedProfile, NormalizedFinancialStatement
from src.backend.core.logging import logger

# Maintain 28-digit precision for financial accounting ratios
getcontext().prec = 28

class FinancialRatios(BaseModel):
    """Calculated institutional-grade financial ratios."""
    gross_margin_percent: Optional[Decimal] = None
    net_margin_percent: Optional[Decimal] = None
    return_on_equity_percent: Optional[Decimal] = None
    return_on_assets_percent: Optional[Decimal] = None
    debt_to_equity_ratio: Optional[Decimal] = None
    current_ratio: Optional[Decimal] = None
    pe_ratio: Optional[Decimal] = None
    free_cash_flow: Optional[Decimal] = None
    eps: Optional[Decimal] = None

class CompanyFundamentals(BaseModel):
    """Comprehensive fundamental snapshot of an enterprise."""
    symbol: str
    profile: NormalizedProfile
    ratios: FinancialRatios
    latest_income_statement: Optional[NormalizedFinancialStatement] = None
    latest_balance_sheet: Optional[NormalizedFinancialStatement] = None
    latest_cash_flow: Optional[NormalizedFinancialStatement] = None
    historical_periods_available: int = 0

class FundamentalAnalysisService:
    """Orchestrates fundamental data extraction and financial ratio computations."""

    def __init__(self, router: FinancialDataRouter = financial_router):
        self.router = router

    def _safe_decimal(self, val: Any) -> Optional[Decimal]:
        if val is None or val == "":
            return None
        try:
            return Decimal(str(val))
        except (InvalidOperation, TypeError, ValueError):
            return None

    def calculate_ratios(
        self,
        income: Optional[NormalizedFinancialStatement] = None,
        balance: Optional[NormalizedFinancialStatement] = None,
        cash_flow: Optional[NormalizedFinancialStatement] = None,
        current_price: Optional[Decimal] = None
    ) -> FinancialRatios:
        """Deterministically computes standard profitability, liquidity, and valuation metrics."""
        inc_metrics = income.metrics if income else {}
        bal_metrics = balance.metrics if balance else {}
        cf_metrics = cash_flow.metrics if cash_flow else {}

        revenue = self._safe_decimal(inc_metrics.get("revenue"))
        gross_profit = self._safe_decimal(inc_metrics.get("grossProfit"))
        net_income = self._safe_decimal(inc_metrics.get("netIncome"))
        eps = self._safe_decimal(inc_metrics.get("eps"))

        total_assets = self._safe_decimal(bal_metrics.get("totalAssets"))
        stockholder_equity = self._safe_decimal(bal_metrics.get("totalStockholdersEquity"))
        total_debt = self._safe_decimal(bal_metrics.get("totalDebt"))
        current_assets = self._safe_decimal(bal_metrics.get("totalCurrentAssets"))
        current_liabilities = self._safe_decimal(bal_metrics.get("totalCurrentLiabilities"))

        free_cf = self._safe_decimal(cf_metrics.get("freeCashFlow"))
        operating_cf = self._safe_decimal(cf_metrics.get("netCashProvidedByOperatingActivities"))
        capex = self._safe_decimal(cf_metrics.get("capitalExpenditure"))

        # Free Cash Flow fallback calculation
        if free_cf is None and operating_cf is not None and capex is not None:
            # Capex is often reported as negative or positive in various GAAP reports
            free_cf = operating_cf - abs(capex)

        # 1. Gross Profit Margin: (Gross Profit / Revenue) * 100
        gross_margin = None
        if gross_profit is not None and revenue is not None and revenue != Decimal("0"):
            gross_margin = round((gross_profit / revenue) * Decimal("100"), 2)

        # 2. Net Profit Margin: (Net Income / Revenue) * 100
        net_margin = None
        if net_income is not None and revenue is not None and revenue != Decimal("0"):
            net_margin = round((net_income / revenue) * Decimal("100"), 2)

        # 3. Return on Equity (ROE): (Net Income / Stockholder Equity) * 100
        roe = None
        if net_income is not None and stockholder_equity is not None and stockholder_equity != Decimal("0"):
            roe = round((net_income / stockholder_equity) * Decimal("100"), 2)

        # 4. Return on Assets (ROA): (Net Income / Total Assets) * 100
        roa = None
        if net_income is not None and total_assets is not None and total_assets != Decimal("0"):
            roa = round((net_income / total_assets) * Decimal("100"), 2)

        # 5. Debt to Equity: (Total Debt / Stockholder Equity)
        debt_to_equity = None
        if total_debt is not None and stockholder_equity is not None and stockholder_equity != Decimal("0"):
            debt_to_equity = round(total_debt / stockholder_equity, 2)

        # 6. Current Ratio: (Current Assets / Current Liabilities)
        curr_ratio = None
        if current_assets is not None and current_liabilities is not None and current_liabilities != Decimal("0"):
            curr_ratio = round(current_assets / current_liabilities, 2)

        # 7. Price to Earnings (P/E): current_price / EPS
        pe = None
        if current_price is not None and eps is not None and eps > Decimal("0"):
            pe = round(current_price / eps, 2)

        return FinancialRatios(
            gross_margin_percent=gross_margin,
            net_margin_percent=net_margin,
            return_on_equity_percent=roe,
            return_on_assets_percent=roa,
            debt_to_equity_ratio=debt_to_equity,
            current_ratio=curr_ratio,
            pe_ratio=pe,
            free_cash_flow=free_cf,
            eps=eps
        )

    async def get_profile(self, symbol: str) -> NormalizedProfile:
        """Fetches standardized company profile."""
        return await self.router.get_company_profile(symbol)

    async def get_statements(
        self,
        symbol: str,
        statement_type: str = "INCOME",
        limit: int = 5
    ) -> List[NormalizedFinancialStatement]:
        """Fetches specific statements (INCOME, BALANCE_SHEET, CASH_FLOW)."""
        st_type = statement_type.upper()
        if st_type in ("BALANCE", "BALANCE_SHEET"):
            return await self.router.get_balance_sheets(symbol, limit=limit)
        elif st_type in ("CASH", "CASH_FLOW"):
            return await self.router.get_cash_flows(symbol, limit=limit)
        else:
            return await self.router.get_income_statements(symbol, limit=limit)

    async def get_fundamentals(self, symbol: str) -> CompanyFundamentals:
        """Provides full enterprise fundamental overview combining profile, 3 statements, and ratios."""
        profile = await self.get_profile(symbol)

        # Fetch latest quotes for P/E valuation
        current_price = None
        try:
            quote = await self.router.get_quote(symbol)
            current_price = quote.price
        except Exception as e:
            logger.info("Could not fetch quote for P/E calculation of %s: %s", symbol, e)

        # Fetch statements
        income_statements = []
        balance_sheets = []
        cash_flows = []

        try:
            income_statements = await self.get_statements(symbol, "INCOME", limit=5)
        except Exception as e:
            logger.warning("Could not fetch income statements for %s: %s", symbol, e)

        try:
            balance_sheets = await self.get_statements(symbol, "BALANCE_SHEET", limit=5)
        except Exception as e:
            logger.warning("Could not fetch balance sheets for %s: %s", symbol, e)

        try:
            cash_flows = await self.get_statements(symbol, "CASH_FLOW", limit=5)
        except Exception as e:
            logger.warning("Could not fetch cash flow statements for %s: %s", symbol, e)

        latest_income = income_statements[0] if income_statements else None
        latest_balance = balance_sheets[0] if balance_sheets else None
        latest_cashflow = cash_flows[0] if cash_flows else None

        ratios = self.calculate_ratios(
            income=latest_income,
            balance=latest_balance,
            cash_flow=latest_cashflow,
            current_price=current_price
        )

        return CompanyFundamentals(
            symbol=symbol.upper(),
            profile=profile,
            ratios=ratios,
            latest_income_statement=latest_income,
            latest_balance_sheet=latest_balance,
            latest_cash_flow=latest_cashflow,
            historical_periods_available=len(income_statements)
        )

fundamental_service = FundamentalAnalysisService()
