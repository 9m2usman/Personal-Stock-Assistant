"""
Unit Tests for Conversational AI Assistant & Tool Engine
Verifies intent classification, tool schemas, and agent grounded response generation.
"""
import pytest
from decimal import Decimal
from datetime import date, datetime, timezone
from src.backend.ai.intent import intent_classifier, FinancialIntent
from src.backend.ai.tools.registry import tool_registry
from src.backend.ai.agent import ai_agent
from src.backend.data_ingestion.base import NormalizedQuote, NormalizedBar, NormalizedProfile, NormalizedFinancialStatement

def test_intent_classification():
    # 1. Price check
    e1 = intent_classifier.classify("What is the current price of NVDA?")
    assert e1.intent == FinancialIntent.PRICE_CHECK
    assert "NVDA" in e1.symbols

    # 2. Technical analysis with indicators
    e2 = intent_classifier.classify("Calculate 14-day RSI and 50-day SMA for Apple")
    assert e2.intent == FinancialIntent.TECHNICAL_ANALYSIS
    assert "AAPL" in e2.symbols
    assert "RSI" in e2.indicators_requested
    assert "SMA" in e2.indicators_requested

    # 3. Fundamental analysis
    e3 = intent_classifier.classify("Show P/E ratio, profit margins and debt to equity for Microsoft")
    assert e3.intent == FinancialIntent.FUNDAMENTAL_ANALYSIS
    assert "MSFT" in e3.symbols

    # 4. News
    e4 = intent_classifier.classify("What are the latest news headlines on Tesla?")
    assert e4.intent == FinancialIntent.NEWS_SENTIMENT
    assert "TSLA" in e4.symbols

    # 5. General greeting
    e5 = intent_classifier.classify("Hello there, how are you?")
    assert e5.intent == FinancialIntent.GENERAL_QUERY

def test_tool_registry_schemas():
    schemas = tool_registry.get_schemas()
    assert len(schemas) >= 5
    tool_names = [s["name"] for s in schemas]
    assert "get_stock_quote" in tool_names
    assert "get_technical_analysis" in tool_names
    assert "get_company_fundamentals" in tool_names
    assert "search_market_news" in tool_names
    assert "convert_currency" in tool_names

@pytest.mark.asyncio
async def test_ai_agent_price_flow(monkeypatch):
    async def mock_quote(symbol):
        return {
            "symbol": symbol,
            "price": "130.00",
            "change": "3.50",
            "change_percent": "2.76",
            "currency": "USD",
            "exchange": "NASDAQ",
            "as_of": "2026-03-30T16:00:00Z",
            "provider": "mock"
        }

    monkeypatch.setattr(tool_registry, "execute", lambda name, args: mock_quote(args["symbol"]))

    res = await ai_agent.process_message("test_sess_1", "What is the price of NVDA?")
    assert res.session_id == "test_sess_1"
    assert "NVDA" in res.message.content
    assert len(res.message.widgets) == 1
    assert res.message.widgets[0].widget_type == "QUOTE_CARD"
    assert res.message.citations is not None
