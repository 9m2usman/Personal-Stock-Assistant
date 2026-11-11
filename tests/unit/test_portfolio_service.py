"""
Unit Tests for Portfolio Management & What-If Scenario Service
Verifies Excel spreadsheet parsing, FX currency normalization, HHI calculation, and stress testing.
"""
import pytest
import io
import openpyxl
from decimal import Decimal
from datetime import datetime, timezone, date
from src.backend.services.portfolio_service import (
    PortfolioManagementService,
    RawHoldingInput,
    portfolio_service
)
from src.backend.services.scenario_service import scenario_service, ScenarioParameter
from src.backend.data_ingestion.base import NormalizedQuote, NormalizedFXRate

def create_mock_excel_bytes() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Holdings"
    ws.append(["Ticker Symbol", "Shares Owned", "Purchase Price", "Denomination"])
    ws.append(["NVDA", 10, 100.0, "USD"])
    ws.append(["AAPL", 20, 150.0, "USD"])
    ws.append(["MSFT", 5, 300.0, "USD"])
    stream = io.BytesIO()
    wb.save(stream)
    return stream.getvalue()

def test_parse_spreadsheet_fuzzy_matching():
    excel_data = create_mock_excel_bytes()
    holdings = portfolio_service.parse_spreadsheet(excel_data, "my_portfolio.xlsx")

    assert len(holdings) == 3
    assert holdings[0].symbol == "NVDA"
    assert holdings[0].quantity == 10.0
    assert holdings[0].average_cost == 100.0
    assert holdings[0].currency == "USD"

    assert holdings[1].symbol == "AAPL"
    assert holdings[1].quantity == 20.0

@pytest.mark.asyncio
async def test_evaluate_portfolio_with_fx():
    class MockRouter:
        async def get_fx_rate(self, base_currency: str, target_currency: str):
            # GBP to USD = 1.25
            rate = Decimal("1.25") if base_currency.upper() == "GBP" else Decimal("1.0")
            return NormalizedFXRate(
                base_currency=base_currency.upper(),
                target_currency=target_currency.upper(),
                rate=rate,
                date=date(2026, 3, 30),
                source="mock"
            )

    class MockMarketService:
        async def get_realtime_quote(self, symbol: str):
            prices = {"NVDA": Decimal("150.0"), "HSBA": Decimal("8.0")}
            return NormalizedQuote(
                symbol=symbol,
                price=prices.get(symbol.upper(), Decimal("100.0")),
                change=Decimal("2.0"),
                change_percent=Decimal("1.5"),
                currency="USD",
                exchange="US",
                as_of=datetime.now(timezone.utc),
                provider="mock"
            )

    svc = PortfolioManagementService(router=MockRouter(), market_svc=MockMarketService())

    holdings = [
        RawHoldingInput(symbol="NVDA", quantity=10, average_cost=100.0, currency="USD"),
        RawHoldingInput(symbol="HSBA", quantity=100, average_cost=6.0, currency="GBP")
    ]

    analytics = await svc.evaluate_portfolio(holdings, base_currency="USD")

    assert analytics.base_currency == "USD"
    # NVDA: qty=10, cost=100, val=1500, pnl=500
    # HSBA: qty=100, cost=6*1.25=7.5 norm_cost, cost_basis=750, val=8*100=800, pnl=50
    # Total val: 1500 + 800 = 2300
    assert analytics.total_market_value == 2300.0
    assert analytics.total_cost_basis == 1750.0
    assert analytics.total_unrealized_pnl == 550.0
    assert analytics.herfindahl_index > 0

    # Scenario Simulation: -10% market crash
    sim = scenario_service.simulate_scenario(analytics, ScenarioParameter(market_shock_percent=-10.0))
    assert sim.simulated_total_value == 2070.0  # 2300 * 0.9
    assert sim.total_value_change == -230.0
    assert sim.total_value_change_percent == -10.0
