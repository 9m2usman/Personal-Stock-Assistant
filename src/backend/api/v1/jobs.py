"""
Asynchronous Job Execution API Routes
Allows dispatching and polling long-running research reports, batch scans, and simulation tasks.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, status, HTTPException
from pydantic import BaseModel, Field
from celery.result import AsyncResult
from src.backend.workers.celery_app import celery_app
from src.backend.workers.tasks import (
    generate_deep_research_report,
    batch_fetch_market_quotes,
    rebalance_portfolio_simulation
)

router = APIRouter()

class ResearchJobRequest(BaseModel):
    symbol: str = Field(..., description="Ticker symbol to compile institutional research for")

class BatchQuoteJobRequest(BaseModel):
    symbols: List[str] = Field(..., min_length=1, max_length=50, description="List of ticker symbols")

class RebalanceJobRequest(BaseModel):
    current_holdings: List[Dict[str, Any]] = Field(..., description="List of holdings with 'symbol' and 'market_value'")
    target_weights: Dict[str, float] = Field(..., description="Target allocation weights summing to 1.0")

class JobStatusResponse(BaseModel):
    task_id: str
    status: str
    ready: bool
    successful: bool
    result: Optional[Any] = None

@router.post("/research", response_model=JobStatusResponse, status_code=status.HTTP_202_ACCEPTED, summary="Enqueue Deep Research Task")
async def enqueue_deep_research(request: ResearchJobRequest):
    """Enqueues async deep research report generation."""
    task = generate_deep_research_report.delay(request.symbol)
    return JobStatusResponse(
        task_id=task.id,
        status=task.status,
        ready=task.ready(),
        successful=task.successful(),
        result=task.result if task.ready() else None
    )

@router.post("/batch-quotes", response_model=JobStatusResponse, status_code=status.HTTP_202_ACCEPTED, summary="Enqueue Batch Quotes Task")
async def enqueue_batch_quotes(request: BatchQuoteJobRequest):
    """Enqueues async batch quotes fetch."""
    task = batch_fetch_market_quotes.delay(request.symbols)
    return JobStatusResponse(
        task_id=task.id,
        status=task.status,
        ready=task.ready(),
        successful=task.successful(),
        result=task.result if task.ready() else None
    )

@router.post("/rebalance-simulation", response_model=JobStatusResponse, status_code=status.HTTP_202_ACCEPTED, summary="Enqueue Rebalance Simulation")
async def enqueue_rebalance_simulation(request: RebalanceJobRequest):
    """Enqueues async portfolio rebalance simulation."""
    task = rebalance_portfolio_simulation.delay(request.current_holdings, request.target_weights)
    return JobStatusResponse(
        task_id=task.id,
        status=task.status,
        ready=task.ready(),
        successful=task.successful(),
        result=task.result if task.ready() else None
    )

@router.get("/status/{task_id}", response_model=JobStatusResponse, status_code=status.HTTP_200_OK, summary="Get Background Job Status")
async def get_job_status(task_id: str):
    """Poll status and result of any enqueued background task."""
    task_result = AsyncResult(task_id, app=celery_app)
    return JobStatusResponse(
        task_id=task_id,
        status=task_result.status,
        ready=task_result.ready(),
        successful=task_result.successful(),
        result=task_result.result if task_result.ready() else None
    )
