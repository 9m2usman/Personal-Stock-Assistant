"""
Sandbox API Routes
Provides secure Python calculation execution for financial models and simulations.
"""
from typing import Optional
from fastapi import APIRouter, status
from pydantic import BaseModel, Field
from src.backend.sandbox.executor import sandbox_executor, SandboxExecutionResult

router = APIRouter()

class SandboxExecuteRequest(BaseModel):
    code: str = Field(..., description="Python code block to execute in isolation")
    timeout_seconds: Optional[float] = Field(default=5.0, ge=0.5, le=10.0, description="Max execution duration in seconds")

@router.post("/execute", response_model=SandboxExecutionResult, status_code=status.HTTP_200_OK, summary="Execute Code in Python Sandbox")
async def execute_in_sandbox(request: SandboxExecuteRequest):
    """Executes custom Python financial calculations in an isolated, monitored subprocess."""
    return await sandbox_executor.execute_code(request.code, timeout_seconds=request.timeout_seconds)
