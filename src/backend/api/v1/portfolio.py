"""
Portfolio Management & What-If Scenario API Routes
Provides spreadsheet parsing, live portfolio evaluation, and risk stress tests.
"""
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, status, HTTPException
from pydantic import BaseModel, Field
from src.backend.services.portfolio_service import (
    portfolio_service,
    RawHoldingInput,
    PortfolioAnalytics
)
from src.backend.services.scenario_service import (
    scenario_service,
    ScenarioParameter,
    ScenarioSimulationResult,
    SellOrder,
    BuyOrder,
    ComprehensiveScenarioResult
)

router = APIRouter()

class EvaluatePortfolioRequest(BaseModel):
    holdings: List[RawHoldingInput] = Field(..., description="List of raw portfolio positions")
    base_currency: str = Field(default="USD", description="Target base currency for valuation (e.g. USD, EUR, GBP)")

class WhatIfSimulationRequest(BaseModel):
    holdings: List[RawHoldingInput] = Field(..., description="List of current portfolio positions")
    scenario: ScenarioParameter = Field(..., description="Market shock or reallocation parameters")
    base_currency: str = Field(default="USD", description="Base currency")

class ReallocationScenarioRequest(BaseModel):
    holdings: List[RawHoldingInput] = Field(..., description="List of current portfolio positions")
    sells: List[SellOrder] = Field(default_factory=list, description="Sell orders to execute in simulation")
    buys: List[BuyOrder] = Field(default_factory=list, description="Buy orders to deploy proceeds into")
    capital_injection: float = Field(default=0.0, description="Optional extra cash injected into simulation")
    natural_language_prompt: Optional[str] = Field(default=None, description="Optional natural language scenario (e.g. 'Sell Tesla and put 60% in NVDA and 40% in AMD')")
    base_currency: str = Field(default="USD", description="Base currency for valuation")

@router.post("/upload-spreadsheet", response_model=PortfolioAnalytics, status_code=status.HTTP_200_OK, summary="Upload & Ingest Excel/CSV Portfolio")
async def upload_spreadsheet(
    file: UploadFile = File(..., description="Spreadsheet (.xlsx or .csv)"),
    base_currency: str = Form(default="USD", description="Base currency for valuation")
):
    """Uploads portfolio spreadsheet, auto-detects column mappings, and computes risk analytics."""
    if not file.filename.lower().endswith((".xlsx", ".csv", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload an .xlsx or .csv spreadsheet."
        )

    content = await file.read()
    try:
        raw_holdings = portfolio_service.parse_spreadsheet(content, file.filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Spreadsheet parsing error: {str(e)}"
        )

    if not raw_holdings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid holdings detected in the uploaded spreadsheet."
        )

    return await portfolio_service.evaluate_portfolio(raw_holdings, base_currency=base_currency)

@router.post("/evaluate", response_model=PortfolioAnalytics, status_code=status.HTTP_200_OK, summary="Evaluate Portfolio Holdings")
async def evaluate_holdings(request: EvaluatePortfolioRequest):
    """Calculates live market value, unrealized P/L, weights, and HHI for provided holdings."""
    return await portfolio_service.evaluate_portfolio(request.holdings, base_currency=request.base_currency)

@router.post("/simulate-what-if", response_model=ScenarioSimulationResult, status_code=status.HTTP_200_OK, summary="Simulate What-If Market Scenario")
async def simulate_what_if(request: WhatIfSimulationRequest):
    """Runs hypothetical market shock (-10%, +15%) or capital re-allocation simulation."""
    current_analytics = await portfolio_service.evaluate_portfolio(request.holdings, base_currency=request.base_currency)
    return scenario_service.simulate_scenario(current_analytics, request.scenario)

@router.post("/scenario/reallocate", response_model=ComprehensiveScenarioResult, status_code=status.HTTP_200_OK, summary="Execute Hypothetical Buy/Sell Reallocation Scenario")
async def simulate_reallocation(request: ReallocationScenarioRequest):
    """
    Executes a multi-leg hypothetical buy/sell rebalancing simulation:
    - Sells specified shares or percentages of existing holdings at live market quotes.
    - Allocates net proceeds to target equities based on percentage or dollar weights.
    - Calculates before/after NAV, cash balance, sector allocation, and HHI concentration delta.
    - Provides regulatory disclosures (hypothetical, no tax/slippage/brokerage execution).
    """
    if not request.holdings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot simulate reallocation without current portfolio holdings."
        )

    current_analytics = await portfolio_service.evaluate_portfolio(request.holdings, base_currency=request.base_currency)

    sells = list(request.sells)
    buys = list(request.buys)

    # If natural language prompt was provided and sells/buys were not explicitly passed, parse it
    if request.natural_language_prompt and (not sells and not buys):
        avail_syms = [p.symbol for p in current_analytics.positions]
        parsed_sells, parsed_buys = scenario_service.parse_natural_language_scenario(request.natural_language_prompt, avail_syms)
        sells.extend(parsed_sells)
        buys.extend(parsed_buys)

    if not sells and not buys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid sell or buy orders specified or parsed from prompt."
        )

    return await scenario_service.execute_reallocation_scenario(
        current_analytics=current_analytics,
        sells=sells,
        buys=buys,
        capital_injection=request.capital_injection
    )
