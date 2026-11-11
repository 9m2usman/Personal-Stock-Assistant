# AI Stock Market Assistant — AI Harness Architecture & Tool Registry

**Document Purpose:** Technical specification and architecture guide for the conversational AI research harness and tool calling execution engine.

---

## 1. Modular Harness Architecture

The AI Harness coordinates user dialogue, financial domain intent identification, multi-exchange instrument resolution, permission validation, function tool execution, and institutional response synthesis.

```
User Request
    │
    ▼
[ Conversation Manager & Session Memory ]  (src/backend/ai/context.py)
    │
    ▼
[ Intent & Entity Classifier ]             (src/backend/ai/intent.py)
    │
    ▼
[ Instrument Resolver ]                     (src/backend/services/instrument_service.py)
    │
    ▼
[ Policy & Permission Engine ]              (src/backend/ai/policy.py)
    │
    ▼
[ Function Tool Registry ]                  (src/backend/ai/tools/registry.py)
    │
    ├─► Market Data Service (Quotes, OHLCV, Technica Indicators)
    ├─► Fundamental Service (SEC EDGAR, FMP 3-Statement, Ratios)
    ├─► Financial News Service (NewsAPI, Lexicon Sentiment)
    ├─► Portfolio Service (Spreadsheet parsing, ECB FX, HHI Risk)
    ├─► Python Analytical Sandbox (Subprocess isolation)
    └─► Celery Background Workers (Distributed research jobs)
    │
    ▼
[ Result Normalizer & UI Widget Generator ] (src/backend/ai/orchestrator.py)
    │
    ▼
Institutional Grounded Response (Zero Hallucination with Citations)
```

---

## 2. Tool Registry Specification

All 13 financial tools are registered in `src/backend/ai/tools/registry.py` with typed Pydantic models and strict JSON schemas compatible with OpenAI function calling, Anthropic tool use, and Gemini schemas:

| # | Tool Name | Description | Key Parameters | Return Type |
| :-: | :--- | :--- | :--- | :--- |
| **1** | `search_instruments` | Searches global equities across company name, ticker, exchange, country | `query: str`, `exchange?: str`, `limit?: int` | `Dict[str, Any]` (matches, total) |
| **2** | `get_stock_quote` | Retrieves real-time or delayed quote snapshot | `symbol: str` | `NormalizedQuote` |
| **3** | `get_historical_prices` | Retrieves daily historical OHLCV bars | `symbol: str`, `limit?: int` | `List[NormalizedBar]` |
| **4** | `calculate_technical_indicators` | Calculates SMA, EMA, RSI (Wilder 14), MACD, Bollinger Bands, Volatility | `symbol: str`, `limit?: int` | `ChartReadyTechnicalPayload` |
| **5** | `get_company_profile` | Retrieves official company profile, description, sector, and industry | `symbol: str` | `NormalizedProfile` |
| **6** | `get_financial_statements` | Retrieves 3-statement financials (Income, Balance, Cash Flow) & audited ratios | `symbol: str` | `CompanyFundamentals` |
| **7** | `get_company_news` | Searches recent financial headlines with citations and summaries | `query: str`, `limit?: int` | `List[NormalizedNewsArticle]` |
| **8** | `analyze_sentiment` | Computes financial lexicon sentiment polarity score (-1.0 to +1.0) and breakdown | `symbol: str`, `limit?: int` | `CompanySentimentOverview` |
| **9** | `analyze_portfolio` | Evaluates holdings, normalizes FX currencies via ECB, and calculates HHI concentration | `holdings: List[Dict]`, `base_currency?: str` | `PortfolioAnalytics` |
| **10** | `calculate_currency_conversion` | Converts monetary amounts using official European Central Bank rates | `amount: float`, `base_currency: str`, `target_currency: str` | `Dict[str, Any]` |
| **11** | `run_python_analysis` | Evaluates mathematical algorithms inside isolated subprocess sandbox | `code: str`, `timeout_seconds?: float` | `SandboxExecutionResult` |
| **12** | `submit_background_analysis` | Submits asynchronous Celery research report task | `symbol: str` | `Dict[str, Any]` (task_id, status) |
| **13** | `get_analysis_job_status` | Checks completion status and retrieves result of background Celery task | `task_id: str` | `Dict[str, Any]` (status, ready, result) |

---

## 3. Context & Sliding Window Memory

The context layer in `src/backend/ai/context.py` guarantees:
- **Thread-safe Session Isolation:** Separate sessions are completely isolated by `session_id`.
- **Sliding-Window Context:** Retains up to 20 conversation turns per session, pruning older history to avoid token bloat.
- **Active Symbol Memory:** If a user first inquires: *"What is the price of Tesla?"*, and subsequently asks: *"Show its P/E ratio and 50-day moving average"*, the orchestrator carries over `TSLA` as the active symbol.

---

## 4. Policy & Permission Enforcement

The policy engine in `src/backend/ai/policy.py` validates all calls before tool invocation:
1. **Sanitization:** Scans arguments for malicious injection attempts (e.g. `__import__`, `drop table`, `shutil`).
2. **Boundary Enforcement:** Caps historical days to 500, news queries to 20, and sandbox execution to 10.0 seconds.
3. **Symbol Normalization:** Strips whitespace and standardizes tickers to uppercase before downstream execution.

---

## 5. Verification & Testing Record

The AI Harness is verified through both unit and end-to-end integration tests:
- `tests/unit/test_ai_agent.py::test_intent_classification`: PASSED
- `tests/unit/test_ai_agent.py::test_tool_registry_schemas`: PASSED
- `tests/unit/test_ai_agent.py::test_ai_agent_price_flow`: PASSED
- `tests/integration/test_e2e_api.py::test_chat_message_e2e`: PASSED
