"""
Unit Tests for Background Celery Tasks & Job Execution
Verifies batch quotes, rebalance simulations, and deep research tasks in eager mode.
"""
import pytest
from decimal import Decimal
from src.backend.workers.celery_app import celery_app
from src.backend.workers.tasks import (
    rebalance_portfolio_simulation,
    batch_fetch_market_quotes,
    generate_deep_research_report
)
from src.backend.services.market_service import market_service
from src.backend.services.fundamental_service import fundamental_service
from src.backend.data_ingestion.router import financial_router
from src.backend.data_ingestion.base import (
    NormalizedQuote,
    NormalizedProfile,
    NormalizedFinancialStatement
)
from datetime import datetime, timezone, date

# Ensure eager mode for synchronous test evaluation
celery_app.conf.task_always_eager = True

def test_rebalance_portfolio_simulation():
    current_holdings = [
        {"symbol": "NVDA", "market_value": 6000.0},
        {"symbol": "AAPL", "market_value": 4000.0}
    ]
    target_weights = {
        "NVDA": 0.50,
        "AAPL": 0.50
    }

    res = rebalance_portfolio_simulation.delay(current_holdings, target_weights)
    assert res.successful()
    data = res.result

    assert data["total_portfolio_value"] == 10000.0
    assert data["turnover_ratio"] == 0.10  # 1000 reallocation / 10000
    plan = data["rebalance_plan"]
    assert len(plan) == 2

    nvda = next(p for p in plan if p["symbol"] == "NVDA")
    assert nvda["action"] == "SELL"
    assert nvda["delta_capital"] == -1000.0

    aapl = next(p for p in plan if p["symbol"] == "AAPL")
    assert aapl["action"] == "BUY"
    assert aapl["delta_capital"] == 1000.0

def test_batch_quotes_mock(monkeypatch):
    async def mock_quote(sym):
        return NormalizedQuote(
            symbol=sym,
            price=Decimal("150.00"),
            change=Decimal("1.50"),
            change_percent=Decimal("1.00"),
            currency="USD",
            exchange="NASDAQ",
            as_of=datetime.now(timezone.utc),
            provider="mock"
        )

    monkeypatch.setattr(market_service, "get_realtime_quote", mock_quote)

    res = batch_fetch_market_quotes.delay(["NVDA", "AAPL"])
    assert res.successful()
    data = res.result
    assert data["total_requested"] == 2
    assert "NVDA" in data["quotes"]
    assert data["quotes"]["NVDA"]["price"] == 150.0
