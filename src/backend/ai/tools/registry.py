"""
AI Tool Registry & Function Calling Schemas
Exposes typed, schema-validated financial tools to the AI Agent Harness.
"""
from typing import Dict, Any, List, Optional, Callable
from decimal import Decimal
from pydantic import BaseModel, Field
from src.backend.services.market_service import market_service
from src.backend.services.fundamental_service import fundamental_service
from src.backend.services.news_service import FinancialNewsService
from src.backend.services.portfolio_service import PortfolioManagementService, RawHoldingInput
from src.backend.services.instrument_service import instrument_service
from src.backend.data_ingestion.router import financial_router
from src.backend.sandbox.executor import sandbox_executor
from src.backend.workers.celery_app import celery_app
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
        self.news_service = FinancialNewsService()
        self.portfolio_service = PortfolioManagementService()
        self._register_default_tools()

    def register(self, name: str, description: str, parameters: Dict[str, Any], handler: Callable):
        self.tools[name] = ToolDefinition(
            name=name,
            description=description,
            parameters=parameters,
            handler=handler
        )

    def _register_default_tools(self):
        # 1. Search Instruments Tool
        self.register(
            name="search_instruments",
            description="Searches global equities by company name, ticker symbol, exchange, country, or instrument type.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search keyword (e.g. NVIDIA, Apple, HSBA, 7203, Microsoft)"},
                    "exchange": {"type": "string", "description": "Optional exchange filter (e.g. NASDAQ, XLON, XJPX)"},
                    "limit": {"type": "integer", "description": "Max instruments to return", "default": 10}
                },
                "required": ["query"]
            },
            handler=self._tool_search_instruments
        )

        # 2. Real-time Quote Tool
        self.register(
            name="get_stock_quote",
            description="Fetches real-time or delayed quote for a given ticker symbol (e.g. NVDA, AAPL, MSFT, HSBA.L).",
            parameters={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Ticker symbol"}
                },
                "required": ["symbol"]
            },
            handler=self._tool_get_stock_quote
        )

        # 3. Historical Prices Tool
        self.register(
            name="get_historical_prices",
            description="Retrieves historical daily candlestick bars (OHLCV) for a given symbol.",
            parameters={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Ticker symbol"},
                    "limit": {"type": "integer", "description": "Number of days (default 100, max 300)", "default": 100}
                },
                "required": ["symbol"]
            },
            handler=self._tool_get_historical_prices
        )

        # 4. Technical Analysis Tool (and alias)
        self.register(
            name="calculate_technical_indicators",
            description="Computes SMA, EMA, Wilder's RSI, MACD, and Bollinger Bands from historical prices.",
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
        self.register(
            name="get_technical_analysis",
            description="Alias for calculate_technical_indicators.",
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

        # 5. Company Profile Tool
        self.register(
            name="get_company_profile",
            description="Retrieves official company profile, business description, sector, industry, and exchange.",
            parameters={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Ticker symbol"}
                },
                "required": ["symbol"]
            },
            handler=self._tool_get_company_profile
        )

        # 6. Financial Statements & Fundamentals Tool
        self.register(
            name="get_financial_statements",
            description="Retrieves 3-statement financial accounting statements (Income, Balance, Cash Flow) and calculated valuation ratios.",
            parameters={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Ticker symbol"}
                },
                "required": ["symbol"]
            },
            handler=self._tool_get_company_fundamentals
        )
        self.register(
            name="get_company_fundamentals",
            description="Alias for get_financial_statements.",
            parameters={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Ticker symbol"}
                },
                "required": ["symbol"]
            },
            handler=self._tool_get_company_fundamentals
        )

        # 7. Financial News Tool
        self.register(
            name="get_company_news",
            description="Searches financial headlines, source citations, and summaries for a company or topic.",
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
        self.register(
            name="search_market_news",
            description="Alias for get_company_news.",
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

        # 8. Sentiment Analysis Tool
        self.register(
            name="analyze_sentiment",
            description="Computes financial lexicon sentiment polarity (-1.0 to +1.0) and bullish/bearish breakdown for a ticker.",
            parameters={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Ticker symbol"},
                    "limit": {"type": "integer", "description": "Max articles to evaluate", "default": 5}
                },
                "required": ["symbol"]
            },
            handler=self._tool_analyze_sentiment
        )

        # 9. Portfolio Analytics Tool
        self.register(
            name="analyze_portfolio",
            description="Evaluates portfolio positions, converts currencies via ECB rates, and calculates PnL and Herfindahl concentration risk.",
            parameters={
                "type": "object",
                "properties": {
                    "holdings": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "symbol": {"type": "string"},
                                "quantity": {"type": "number"},
                                "average_cost": {"type": "number"},
                                "currency": {"type": "string", "default": "USD"}
                            },
                            "required": ["symbol", "quantity", "average_cost"]
                        },
                        "description": "List of portfolio holdings"
                    },
                    "base_currency": {"type": "string", "description": "Target reporting currency", "default": "USD"}
                },
                "required": ["holdings"]
            },
            handler=self._tool_analyze_portfolio
        )

        # 10. Currency FX Conversion Tool
        self.register(
            name="calculate_currency_conversion",
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
        self.register(
            name="convert_currency",
            description="Alias for calculate_currency_conversion.",
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

        # 11. Python Analytical Sandbox Tool
        self.register(
            name="run_python_analysis",
            description="Executes mathematical, statistical, or quantitative financial algorithms inside an isolated subprocess sandbox.",
            parameters={
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python code snippet to execute safely"},
                    "timeout_seconds": {"type": "number", "description": "Max execution time", "default": 5.0}
                },
                "required": ["code"]
            },
            handler=self._tool_run_python_analysis
        )

        # 12. Submit Background Analysis Tool
        self.register(
            name="submit_background_analysis",
            description="Submits an asynchronous background task to compile deep multi-page research dossiers via Celery queue.",
            parameters={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "Ticker symbol to compile dossier for"}
                },
                "required": ["symbol"]
            },
            handler=self._tool_submit_background_analysis
        )

        # 13. Get Analysis Job Status Tool
        self.register(
            name="get_analysis_job_status",
            description="Checks the completion status and retrieves results of a background Celery task.",
            parameters={
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "Celery Task UUID"}
                },
                "required": ["task_id"]
            },
            handler=self._tool_get_analysis_job_status
        )

    # Handlers
    async def _tool_search_instruments(self, query: str, exchange: Optional[str] = None, limit: int = 10) -> Dict[str, Any]:
        results = await instrument_service.search(query=query, exchange=exchange, limit=limit)
        return {"query": query, "total_matches": len(results), "instruments": [i.model_dump(mode="json") for i in results]}

    async def _tool_get_stock_quote(self, symbol: str) -> Dict[str, Any]:
        quote = await market_service.get_realtime_quote(symbol)
        return quote.model_dump(mode="json")

    async def _tool_get_historical_prices(self, symbol: str, limit: int = 100) -> Dict[str, Any]:
        bars = await market_service.get_historical_bars(symbol, limit=limit)
        return {
            "symbol": symbol.upper(),
            "count": len(bars),
            "bars": [b.model_dump(mode="json") for b in bars]
        }

    async def _tool_get_technical_analysis(self, symbol: str, limit: int = 100) -> Dict[str, Any]:
        tech = await market_service.get_technicals(symbol, limit=limit)
        return tech.model_dump(mode="json")

    async def _tool_get_company_profile(self, symbol: str) -> Dict[str, Any]:
        fund = await fundamental_service.get_fundamentals(symbol)
        return fund.profile.model_dump(mode="json")

    async def _tool_get_company_fundamentals(self, symbol: str) -> Dict[str, Any]:
        fund = await fundamental_service.get_fundamentals(symbol)
        return fund.model_dump(mode="json")

    async def _tool_search_market_news(self, query: str, limit: int = 5) -> Dict[str, Any]:
        articles = await financial_router.search_news(query, limit=limit)
        return {"articles": [a.model_dump(mode="json") for a in articles]}

    async def _tool_analyze_sentiment(self, symbol: str, limit: int = 5) -> Dict[str, Any]:
        sentiment = await self.news_service.get_company_sentiment(symbol, limit=limit)
        return sentiment.model_dump(mode="json")

    async def _tool_analyze_portfolio(self, holdings: List[Dict[str, Any]], base_currency: str = "USD") -> Dict[str, Any]:
        parsed = [RawHoldingInput(**h) for h in holdings]
        analytics = await self.portfolio_service.evaluate_portfolio(parsed, base_currency=base_currency)
        return analytics.model_dump(mode="json")

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

    async def _tool_run_python_analysis(self, code: str, timeout_seconds: float = 5.0) -> Dict[str, Any]:
        res = await sandbox_executor.execute_code(code, timeout_seconds=timeout_seconds)
        return res.model_dump(mode="json")

    async def _tool_submit_background_analysis(self, symbol: str) -> Dict[str, Any]:
        from src.backend.workers.tasks import generate_deep_research_report
        async_result = generate_deep_research_report.delay(symbol.upper())
        return {
            "task_id": async_result.id,
            "status": "SUBMITTED",
            "symbol": symbol.upper(),
            "message": f"Deep research report background task submitted for {symbol.upper()}."
        }

    async def _tool_get_analysis_job_status(self, task_id: str) -> Dict[str, Any]:
        async_res = celery_app.AsyncResult(task_id)
        ready = async_res.ready()
        state = async_res.state
        result = async_res.result if ready else None
        return {
            "task_id": task_id,
            "status": state,
            "ready": ready,
            "result": result if not isinstance(result, Exception) else str(result)
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
