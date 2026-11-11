"""
End-to-End Integration Tests for Financial Assistant API
Tests live endpoint routing, validation schemas, and cross-service pipeline execution.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from src.backend.main import app

@pytest.mark.asyncio
async def test_health_endpoints_e2e():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        r1 = await ac.get("/health")
        assert r1.status_code == 200
        assert r1.json()["status"] == "OK"

        r2 = await ac.get("/api/v1/health")
        assert r2.status_code == 200
        assert r2.json()["status"] == "HEALTHY"

@pytest.mark.asyncio
async def test_sandbox_execution_e2e():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "code": "import math\nprint(round(math.sqrt(144.0), 2))",
            "timeout_seconds": 3.0
        }
        res = await ac.post("/api/v1/sandbox/execute", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["stdout"].strip() == "12.0"

@pytest.mark.asyncio
async def test_portfolio_evaluation_and_simulation_e2e():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        holdings = [
            {"symbol": "NVDA", "quantity": 10, "average_cost": 100.0, "currency": "USD"},
            {"symbol": "AAPL", "quantity": 20, "average_cost": 150.0, "currency": "USD"}
        ]

        # 1. Evaluate portfolio
        res_eval = await ac.post("/api/v1/portfolio/evaluate", json={"holdings": holdings, "base_currency": "USD"})
        assert res_eval.status_code == 200
        eval_data = res_eval.json()
        assert eval_data["base_currency"] == "USD"
        assert eval_data["total_market_value"] > 0
        assert len(eval_data["positions"]) == 2

        # 2. Simulate what-if market shock
        sim_payload = {
            "holdings": holdings,
            "scenario": {
                "market_shock_percent": -15.0,
                "capital_injection": 2000.0,
                "reallocations": {}
            },
            "base_currency": "USD"
        }
        res_sim = await ac.post("/api/v1/portfolio/simulate-what-if", json=sim_payload)
        assert res_sim.status_code == 200
        sim_data = res_sim.json()
        assert sim_data["simulated_total_value"] > 0
        assert len(sim_data["simulated_positions"]) == 2

@pytest.mark.asyncio
async def test_chat_message_e2e():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        req = {
            "session_id": "test_e2e_session",
            "content": "Hello! What can you do?"
        }
        res = await ac.post("/api/v1/chat/message", json=req)
        assert res.status_code == 200
        data = res.json()
        assert data["session_id"] == "test_e2e_session"
        assert "institutional AI Stock Market Assistant" in data["message"]["content"]

@pytest.mark.asyncio
async def test_instrument_search_and_watchlist_e2e():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Search by symbol
        r1 = await ac.get("/api/v1/market/search?query=MSFT")
        assert r1.status_code == 200
        matches = r1.json()
        assert len(matches) > 0
        assert matches[0]["display_symbol"] == "MSFT"

        # 2. Search by company name
        r2 = await ac.get("/api/v1/market/search?query=Toyota")
        assert r2.status_code == 200
        toyota_matches = [m["display_symbol"] for m in r2.json()]
        assert "7203.T" in toyota_matches
        assert "TM" in toyota_matches

        # 3. Watchlist
        r3 = await ac.get("/api/v1/market/watchlist")
        assert r3.status_code == 200
        wl = r3.json()
        assert len(wl) >= 6

@pytest.mark.asyncio
async def test_jobs_health_and_research_task_e2e():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Check jobs health
        r_health = await ac.get("/api/v1/jobs/health")
        assert r_health.status_code == 200
        h_data = r_health.json()
        assert "status" in h_data
        assert "tasks.generate_deep_research_report" in h_data["registered_domain_tasks"]

