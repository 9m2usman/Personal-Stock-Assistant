"""
Portfolio Management & What-If Scenario API Routes
Provides spreadsheet parsing, live portfolio evaluation, and risk stress tests.
"""
from typing import List
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
    ScenarioSimulationResult
)

router = APIRouter()

class EvaluatePortfolioRequest(BaseModel):
    holdings: List[RawHoldingInput] = Field(..., description="List of raw portfolio positions")
    base_currency: str = Field(default="USD", description="Target base currency for valuation (e.g. USD, EUR, GBP)")

class WhatIfSimulationRequest(BaseModel):
    holdings: List[RawHoldingInput] = Field(..., description="List of current portfolio positions")
    scenario: ScenarioParameter = Field(..., description="Market shock or reallocation parameters")
    base_currency: str = Field(default="USD", description="Base currency")

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
