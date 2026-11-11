"""
Centralized Financial & System Exceptions
Defines standardized exception classes and FastAPI global error handlers.
"""
from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from datetime import datetime, timezone

class BaseFinancialAssistantException(Exception):
    """Base exception for all domain-specific errors."""
    def __init__(
        self,
        message: str,
        error_code: str = "FINANCIAL_SYSTEM_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}

class InstrumentNotFoundError(BaseFinancialAssistantException):
    """Raised when an equity or financial instrument cannot be resolved."""
    def __init__(self, symbol_or_query: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"Financial instrument '{symbol_or_query}' could not be identified or resolved.",
            error_code="INSTRUMENT_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )

class ProviderRateLimitError(BaseFinancialAssistantException):
    """Raised when an external API provider's rate limit quota is exhausted."""
    def __init__(self, provider_name: str, retry_after_sec: Optional[int] = None):
        super().__init__(
            message=f"External provider '{provider_name}' rate limit exhausted. Please retry later.",
            error_code="PROVIDER_RATE_LIMITED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details={"provider": provider_name, "retry_after_seconds": retry_after_sec}
        )

class ProviderTierRestrictionError(BaseFinancialAssistantException):
    """Raised when data for an instrument is gated by a provider paid plan."""
    def __init__(self, provider_name: str, symbol: str, required_plan: str):
        super().__init__(
            message=f"Market data for '{symbol}' on '{provider_name}' requires an upgraded subscription tier ({required_plan}).",
            error_code="PROVIDER_TIER_RESTRICTION",
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            details={"provider": provider_name, "symbol": symbol, "required_plan": required_plan}
        )

class CurrencyMismatchError(BaseFinancialAssistantException):
    """Raised when an operation attempts to aggregate values across differing currencies without conversion."""
    def __init__(self, currency_a: str, currency_b: str):
        super().__init__(
            message=f"Currency aggregation violation: cannot combine '{currency_a}' and '{currency_b}' without explicit FX rate conversion.",
            error_code="CURRENCY_MISMATCH",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"source_currency": currency_a, "target_currency": currency_b}
        )

async def financial_exception_handler(request: Request, exc: BaseFinancialAssistantException) -> JSONResponse:
    """FastAPI error handler formatting domain exceptions into standardized JSON responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "timestamp_utc": datetime.now(timezone.utc).isoformat()
            }
        }
    )
