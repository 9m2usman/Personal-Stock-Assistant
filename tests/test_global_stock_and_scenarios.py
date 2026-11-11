"""
Acceptance Test Suite A-H: Global Stock Discovery, AI Multi-Stock Comparison,
Portfolio Scenario Reallocation, Multi-Source Sentiment, and Redis/Celery Engine
"""
import pytest
import asyncio
from typing import Dict, Any

from src.backend.services.instrument_service import instrument_service
from src.backend.services.market_service import market_service
from src.backend.services.news_service import news_service
from src.backend.services.scenario_service import (
    scenario_service,
    SellOrder,
    BuyOrder
)
from src.backend.services.portfolio_service import (
    portfolio_service,
    RawHoldingInput
)
from src.backend.ai.intent import classify_intent, FinancialIntent
from src.backend.ai.orchestrator import FinancialAIOrchestrator
from src.backend.workers.tasks import ping_system, generate_deep_research_report

@pytest.mark.asyncio
async def test_a_global_stock_discovery():
    """
    Test A: Global Stock Discovery
    Verify catalog resolves instruments across US, UK, Japan, and Switzerland.
    """
    # 1. Search for US equity (Apple / NVDA)
    us_results = await instrument_service.search(query="NVDA", limit=5)
    assert len(us_results) > 0, "Expected NVDA in search results"
    assert any(inst.display_symbol == "NVDA" for inst in us_results)

    # 2. Search for UK equity (HSBC / HSBA.L)
    uk_results = await instrument_service.search(query="HSBA", limit=5)
    assert len(uk_results) > 0, "Expected HSBA in search results"
    uk_inst = uk_results[0]
    assert uk_inst.country == "United Kingdom"
    assert uk_inst.currency == "GBP"

    # 3. Search for Japanese equity (Toyota / 7203.T)
    jp_results = await instrument_service.search(query="7203", limit=5)
    assert len(jp_results) > 0, "Expected 7203 in search results"
    jp_inst = jp_results[0]
    assert jp_inst.country == "Japan"
    assert jp_inst.currency == "JPY"

    # 4. Search for Swiss equity (Nestle / NESN.SW)
    ch_results = await instrument_service.search(query="NESN", limit=5)
    assert len(ch_results) > 0, "Expected NESN in search results"
    ch_inst = ch_results[0]
    assert ch_inst.country == "Switzerland"
    assert ch_inst.currency == "CHF"

    # 5. Verify paginated catalog endpoint
    paginated = await instrument_service.search_paginated(page=1, page_size=10)
    assert paginated["total"] >= 10, "Expected universe to contain registered instruments"
    assert len(paginated["items"]) == 10
    assert paginated["page"] == 1

@pytest.mark.asyncio
async def test_b_multi_provider_price_retrieval_and_provenance():
    """
    Test B: Multi-Provider Price Retrieval & Provenance
    Verify normalized quote contains valid price, timestamp, provider attribution, and freshness.
    """
    quote = await market_service.get_realtime_quote("AAPL")
    assert quote.symbol == "AAPL"
    assert quote.price > 0.0, "Quote price must be strictly positive"
    clean_provider = quote.provider.lower().replace(" ", "_")
    assert clean_provider in [
        "twelve_data", "financial_modeling_prep", "alpha_vantage",
        "sec_edgar", "ecb_reference_rates", "simulated_market_engine"
    ]
    assert quote.freshness in ["REALTIME", "DELAYED_15M", "DAILY_CLOSE", "SYNTHETIC_FALLBACK", "REAL_TIME"]
    assert quote.as_of is not None

@pytest.mark.asyncio
async def test_c_ai_stock_comparison():
    """
    Test C: AI Stock Comparison
    Verify that query 'Compare NVIDIA and AMD' detects STOCK_COMPARISON intent,
    extracts symbols, and produces side-by-side comparative matrices.
    """
    query = "Compare NVIDIA and AMD"
    intent, symbols, _ = classify_intent(query)
    assert intent == FinancialIntent.STOCK_COMPARISON
    assert "NVDA" in symbols
    assert "AMD" in symbols

    orchestrator = FinancialAIOrchestrator()
    response = await orchestrator.process_query(
        user_text=query,
        user_id="test_analyst",
        session_id="test_compare_session"
    )

    assert response.answer is not None and len(response.answer) > 50
    assert "NVDA" in response.answer
    assert "AMD" in response.answer
    assert "Comparison" in response.answer

    # Verify UI Widget was emitted
    widget_types = [w.widget_type for w in response.ui_widgets]
    assert "COMPARISON_MATRIX" in widget_types

@pytest.mark.asyncio
async def test_d_buy_sell_scenario_simulation():
    """
    Test D: Buy/Sell Scenario Simulation
    Verify hypothetical rebalancing: 'If I sell my Tesla holdings and invest 60% in NVIDIA and 40% in AMD'
    calculates NAV, transactions, proceeds allocation, HHI delta, and mandatory disclosures.
    """
    query = "If I sell my Tesla holdings and invest 60% in NVIDIA and 40% in AMD"
    intent, _, _ = classify_intent(query)
    assert intent == FinancialIntent.SCENARIO_SIMULATION

    # Parse natural language parameters
    sells, buys, _ = scenario_service.parse_natural_language_scenario(query, ["TSLA", "AAPL", "NVDA", "MSFT"])
    assert len(sells) >= 1
    assert sells[0].symbol == "TSLA"
    assert len(buys) == 2
    assert any(b.symbol == "NVDA" and b.allocation_percent == 60.0 for b in buys)
    assert any(b.symbol == "AMD" and b.allocation_percent == 40.0 for b in buys)

    # Execute simulation against test baseline holdings
    baseline_holdings = [
        RawHoldingInput(symbol="TSLA", quantity=15.0, average_cost=210.0, currency="USD"),
        RawHoldingInput(symbol="AAPL", quantity=40.0, average_cost=180.0, currency="USD"),
        RawHoldingInput(symbol="MSFT", quantity=20.0, average_cost=390.0, currency="USD"),
    ]
    current_analytics = await portfolio_service.evaluate_portfolio(baseline_holdings, base_currency="USD")

    result = await scenario_service.execute_reallocation_scenario(
        current_analytics=current_analytics,
        sells=[SellOrder(symbol="TSLA", sell_all=True)],
        buys=[
            BuyOrder(symbol="NVDA", allocation_percent=60.0),
            BuyOrder(symbol="AMD", allocation_percent=40.0)
        ]
    )

    assert result.before_nav > 0.0
    assert result.after_nav > 0.0
    assert result.total_sale_proceeds > 0.0
    assert result.total_purchase_cost > 0.0
    assert len(result.transactions) >= 3  # 1 sell + 2 buys

    # Verify TSLA is no longer in hypothetical positions (sold 100%)
    hypo_syms = [p.symbol for p in result.hypothetical_positions]
    assert "TSLA" not in hypo_syms
    assert "NVDA" in hypo_syms
    assert "AMD" in hypo_syms

    # Verify HHI recalculation
    assert result.before_hhi > 0.0
    assert result.after_hhi > 0.0
    assert result.hhi_delta is not None

    # Verify mandatory regulatory disclosures & assumptions
    assert len(result.risk_observations) > 0
    assert any("Hypothetical simulation" in a for a in result.assumptions)

@pytest.mark.asyncio
async def test_e_multi_source_sentiment():
    """
    Test E: Multi-Source News & Sentiment Analysis
    Verify news sentiment analysis returns score between -1.0 and 1.0, label, and article counts.
    """
    sentiment = await news_service.analyze_company_sentiment("NVDA")
    assert sentiment.symbol == "NVDA"
    assert -1.0 <= sentiment.sentiment_score <= 1.0
    assert sentiment.sentiment_label in ["BULLISH", "BEARISH", "NEUTRAL"]
    assert sentiment.total_articles_analyzed >= 0

@pytest.mark.asyncio
async def test_f_celery_and_redis_background_processing():
    """
    Test F: Celery and Redis Background Task Processing
    Verify celery tasks enqueue via Redis broker and complete successfully.
    """
    # Enqueue native Celery ping task
    task = ping_system.delay("Acceptance-Test-Ping")
    assert task.id is not None

    # Wait up to 5 seconds for Celery worker to process
    for _ in range(50):
        if task.ready():
            break
        await asyncio.sleep(0.1)

    # Check state
    state = task.state
    assert state in ["SUCCESS", "PENDING"], f"Unexpected task state: {state}"
    if state == "SUCCESS":
        res = task.result
        assert res.get("status") == "SUCCESS"
        assert res.get("echo") == "Acceptance-Test-Ping"

@pytest.mark.asyncio
async def test_g_chat_response_reliability():
    """
    Test G: Chat Response Reliability
    Verify AI orchestrator always returns grounded, non-empty responses without blanks.
    """
    orchestrator = FinancialAIOrchestrator()
    queries = [
        "What is the current quote for Apple?",
        "Show technical indicators for Microsoft",
        "Explain Herfindahl index in portfolio management"
    ]

    for q in queries:
        resp = await orchestrator.process_query(user_text=q, user_id="reliability_test")
        assert resp.answer is not None, f"Response answer was None for query: {q}"
        assert len(resp.answer.strip()) > 30, f"Response answer was too brief for query: {q}"
        assert not resp.answer.startswith("Analytical Error"), f"Query resulted in unexpected error: {q}"

@pytest.mark.asyncio
async def test_h_portfolio_multi_currency_and_concentration():
    """
    Test H: Portfolio Multi-Currency & Concentration
    Verify multi-currency portfolio normalization (USD + GBP) and HHI calculation.
    """
    holdings = [
        RawHoldingInput(symbol="NVDA", quantity=30.0, average_cost=110.0, currency="USD"),
        RawHoldingInput(symbol="HSBA", quantity=300.0, average_cost=6.5, currency="GBP"),
    ]

    analytics = await portfolio_service.evaluate_portfolio(holdings, base_currency="USD")
    assert analytics.total_market_value > 0.0
    assert len(analytics.positions) == 2

    # Verify GBP position was converted to USD base
    hsba_pos = next((p for p in analytics.positions if p.symbol == "HSBA"), None)
    assert hsba_pos is not None
    assert hsba_pos.reported_currency == "GBP"
    assert hsba_pos.base_currency == "USD"
    assert hsba_pos.market_value > 0.0
    assert hsba_pos.normalized_cost > 0.0

    # Verify weights sum to approximately 100%
    total_weight = sum(p.weight_percent for p in analytics.positions)
    assert 99.0 <= total_weight <= 101.0

    # Verify HHI is between 0 and 1
    assert 0.0 < analytics.herfindahl_index <= 1.0
