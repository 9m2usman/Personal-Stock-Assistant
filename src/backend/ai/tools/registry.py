"""
AI Tool Registry & Function Calling Schemas
Exposes typed, schema-validated financial tools to the AI Agent Harness.
"""
from typing import Dict, Any, List, Optional, Callable
from decimal import Decimal
from pydantic import BaseModel, Field
from src.backend.services.market_service import market_service
from src.backend.services.fundamental_service import fundamental_service
from src.backend.data_ingestion.router import financial_router
from src.backend.core.logging import logger

class ToolParameter(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True

class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: Dict[str, Any]
    handler: Any

class ToolRegistry:
    """Registry maintaining available financial functions for the AI engine."""

    def __init__(self):
        self.tools: Dict[str, ToolDefinition] = {}
        self._register_default_tools()

    def register(self, name: str, description: str, parameters: Dict[str, Any], handler: Callable):
        self.tools[name] = ToolDefinition(
            name=name,
            description=description,
            parameters=parameters,
            handler=handler
        )

    def _register_default_tools(self):
        # 1. Real-time Quote Tool
        self.register(
            name="get_stock_quote",
            description="Fetches real-time or delayed quote for a given ticker symbol (e.g. NVDA, AAPL).",
            parameters={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Ticker symbol"}
                },
                "required": ["symbol"]
            },
            handler=self._tool_get_stock_quote
        )

        # 2. Technical Analysis Tool
        self.register(
            name="get_technical_analysis",
            description="Computes SMA, EMA, RSI, MACD, and Bollinger Bands from historical prices.",
            parameters={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Ticker symbol"},
                    "limit": {"type": "integer", "description": "Number of historical days", "default": 100}
                },
                "required": ["symbol"]
            },
            handler=self._tool_get_technical_analysis
        )

        # 3. Company Fundamentals & Ratios Tool
        self.register(
            name="get_company_fundamentals",
            description="Retrieves company profile, latest 3-statement financials, and calculated ratios (P/E, ROE, margins).",
            parameters={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Ticker symbol"}
                },
                "required": ["symbol"]
            },
            handler=self._tool_get_company_fundamentals
        )

        # 4. Market News Tool
        self.register(
            name="search_market_news",
            description="Searches financial headlines and sentiment for a company or topic.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Company name or topic"},
                    "limit": {"type": "integer", "description": "Max articles to return", "default": 5}
                },
                "required": ["query"]
            },
            handler=self._tool_search_market_news
        )

        # 5. Currency FX Conversion Tool
        self.register(
            name="convert_currency",
            description="Converts monetary amounts using authoritative European Central Bank exchange rates.",
            parameters={
                "type": "object",
                "properties": {
                    "amount": {"type": "number", "description": "Amount to convert"},
                    "base_currency": {"type": "string", "description": "Source ISO currency code (e.g. USD, EUR, GBP)"},
                    "target_currency": {"type": "string", "description": "Target ISO currency code (e.g. USD, EUR, JPY)"}
                },
                "required": ["amount", "base_currency", "target_currency"]
            },
            handler=self._tool_convert_currency
        )

    async def _tool_get_stock_quote(self, symbol: str) -> Dict[str, Any]:
        quote = await market_service.get_realtime_quote(symbol)
        return quote.model_dump(mode="json")

    async def _tool_get_technical_analysis(self, symbol: str, limit: int = 100) -> Dict[str, Any]:
        tech = await market_service.get_technicals(symbol, limit=limit)
        return tech.model_dump(mode="json")

    async def _tool_get_company_fundamentals(self, symbol: str) -> Dict[str, Any]:
        fund = await fundamental_service.get_fundamentals(symbol)
        return fund.model_dump(mode="json")

    async def _tool_search_market_news(self, query: str, limit: int = 5) -> Dict[str, Any]:
        articles = await financial_router.search_news(query, limit=limit)
        return {"articles": [a.model_dump(mode="json") for a in articles]}

    async def _tool_convert_currency(self, amount: float, base_currency: str, target_currency: str) -> Dict[str, Any]:
        fx_rate = await financial_router.get_fx_rate(base_currency, target_currency)
        converted = Decimal(str(amount)) * fx_rate.rate
        return {
            "original_amount": amount,
            "base_currency": base_currency.upper(),
            "target_currency": target_currency.upper(),
            "rate": float(fx_rate.rate),
            "converted_amount": float(round(converted, 2)),
            "rate_date": str(fx_rate.date)
        }

    async def execute(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        if tool_name not in self.tools:
            raise ValueError(f"Tool '{tool_name}' is not registered.")
        handler = self.tools[tool_name].handler
        logger.info("Executing AI Tool [%s] with arguments: %s", tool_name, arguments)
        return await handler(**arguments)

    def get_schemas(self) -> List[Dict[str, Any]]:
        """Returns JSON function schemas compatible with OpenAI / Anthropic / Gemini formats."""
        schemas = []
        for name, defn in self.tools.items():
            schemas.append({
                "name": defn.name,
                "description": defn.description,
                "parameters": defn.parameters
            })
        return schemas

tool_registry = ToolRegistry()
