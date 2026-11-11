"""
Fundamental Analysis API Routes
Provides company profiles, 3-statement financial accounting data, and valuation ratios.
"""
from typing import List, Optional
from fastapi import APIRouter, Query, status
from src.backend.services.fundamental_service import (
    fundamental_service,
    CompanyFundamentals,
    FinancialRatios
)
from src.backend.data_ingestion.base import (
    NormalizedProfile,
    NormalizedFinancialStatement
)

router = APIRouter()

@router.get("/profile", response_model=NormalizedProfile, status_code=status.HTTP_200_OK, summary="Get Company Profile")
async def get_company_profile(
    symbol: str = Query(..., description="Ticker symbol (e.g. NVDA, MSFT, AAPL)")
):
    """Retrieve standardized profile, exchange, market cap, and sector info."""
    return await fundamental_service.get_profile(symbol)

@router.get("/statements", response_model=List[NormalizedFinancialStatement], status_code=status.HTTP_200_OK, summary="Get Financial Statements")
async def get_financial_statements(
    symbol: str = Query(..., description="Ticker symbol"),
    statement_type: str = Query(default="INCOME", description="Statement type: INCOME, BALANCE_SHEET, or CASH_FLOW"),
    limit: int = Query(default=5, ge=1, le=10, description="Number of annual/quarterly periods")
):
    """Retrieve multi-period normalized financial accounting statements."""
    return await fundamental_service.get_statements(symbol, statement_type=statement_type, limit=limit)

@router.get("/ratios", response_model=FinancialRatios, status_code=status.HTTP_200_OK, summary="Get Calculated Financial Ratios")
async def get_financial_ratios(
    symbol: str = Query(..., description="Ticker symbol")
):
    """Retrieve computed margins, ROE, ROA, Debt-to-Equity, Current Ratio, P/E, and FCF."""
    fundamentals = await fundamental_service.get_fundamentals(symbol)
    return fundamentals.ratios

@router.get("/overview", response_model=CompanyFundamentals, status_code=status.HTTP_200_OK, summary="Get Enterprise Fundamental Overview")
async def get_fundamentals_overview(
    symbol: str = Query(..., description="Ticker symbol")
):
    """Retrieve unified fundamental dossier combining profile, latest 3 statements, and ratios."""
    return await fundamental_service.get_fundamentals(symbol)
