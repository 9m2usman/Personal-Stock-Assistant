# AI Stock Market Assistant — Product Rescue Fixes & Architectural Upgrades

**Document Purpose:** Detailed log of all architectural, frontend, and backend engineering remediations executed during product rescue.

---

## 1. Critical Failure: "Why Does the Application Only Show NVIDIA?"

### Root Cause Analysis:
1. **Frontend State Binding:** `App.tsx` initialized state to `selectedSymbol = 'NVDA'`. Child views (`MarketResearch.tsx`, `TechnicalStudio.tsx`, `NewsTerminal.tsx`, `JobsMonitor.tsx`) initialized local state with `useState(initialSymbol)` without any `useEffect` listener to react when the parent `selectedSymbol` changed.
2. **Missing Search API:** The backend API v1 had no instrument search endpoint (`/search`). Users typing into search inputs had nowhere to query.
3. **Single Database Seed:** The local database SQLite `fintech_market.db` contained only a single instrument entity (`NVDA`).
4. **ADR Silent Substitution:** In `router.py`, foreign primary listings (`7203.T`, `NESN.SW`) were silently rewritten into US ADR tickers (`TM`, `NSRGY`) without preserving the primary exchange identity.
5. **No Watchlist Component:** There was no multi-stock watchlist panel or ticker drawer in the UI.

### Remediation Implemented:
1. Created `src/backend/services/instrument_service.py` with canonical institutional coverage:
   - US: `NVDA`, `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `TSLA`, `AMD`, `AVGO`, `JPM`
   - UK LSE: `HSBA.L` (HSBC Holdings plc)
   - Japan TSE: `7203.T` (Toyota Motor Corporation Primary)
   - Switzerland SIX: `NESN.SW` (Nestlé S.A. Primary)
   - US ADRs: `TM` (Toyota NYSE ADR), `NSRGY` (Nestlé OTC ADR)
2. Added `/api/v1/market/search`, `/api/v1/market/instruments`, and `/api/v1/market/watchlist` endpoints in `src/backend/api/v1/market_data.py`.
3. Auto-seeded all canonical exchanges and instruments into the database on application startup (`lifespan` in `src/backend/main.py`).
4. Created `WatchlistDrawer.tsx` in the frontend featuring live quotes, price changes, data freshness, and click-to-select functionality.
5. Built a universal autocomplete search bar in `AppShell.tsx` and synced `selectedSymbol` across all views.

---

## 2. AI Agent Harness Overhaul

### Original Problem:
The AI agent in `src/backend/ai/agent.py` was a monolithic rule-based dispatch without context management, policy validation, or comprehensive tool schemas.

### Remediation Implemented:
1. **Modular Architecture:**
   - `src/backend/ai/context.py`: Thread-safe `ConversationManager` and `ConversationContext` maintaining sliding-window message memory and active ticker context.
   - `src/backend/ai/policy.py`: `PolicyEngine` enforcing permission checks, AST argument sanitization, and execution boundaries.
   - `src/backend/ai/tools/registry.py`: Complete typed registry implementing all 13 financial tools:
     1. `search_instruments`
     2. `get_stock_quote`
     3. `get_historical_prices`
     4. `get_company_profile`
     5. `get_financial_statements`
     6. `calculate_technical_indicators`
     7. `get_company_news`
     8. `analyze_sentiment`
     9. `analyze_portfolio`
     10. `calculate_currency_conversion`
     11. `run_python_analysis`
     12. `submit_background_analysis`
     13. `get_analysis_job_status`
   - `src/backend/ai/orchestrator.py`: Full coordination pipeline generating institutional-grade answers with structured tables, inline widgets, citations, and follow-up prompts.

---

## 3. Python Analytical Sandbox Hardening

### Original Problem:
The sandbox lacked structured output parsing, allowed potential dunder attribute traversal (`__subclasses__`), and had no Windows process tree cleanup on timeouts.

### Remediation Implemented:
1. Added `FORBIDDEN_ATTRIBUTES` in `src/backend/sandbox/executor.py` blocking `__subclasses__`, `__builtins__`, `__globals__`, `__code__`, and `__class__`.
2. Added automatic structured JSON output parsing into `SandboxExecutionResult.output_data`.
3. Added Windows process tree kill (`taskkill /F /T /PID <pid>`) on timeout to prevent zombie child processes.
4. Added unit tests for structured output and dunder rejection in `tests/unit/test_sandbox.py`.

---

## 4. Frontend Redesign & TradingView Chart Upgrade

### Original Problem:
The frontend was a novice template with static charts, no indicator overlays, no date ranges, and no 3D financial identity.

### Remediation Implemented:
1. **Institutional App Shell (`AppShell.tsx`):**
   - Universal search autocomplete dropdown with keyboard navigation.
   - Quick-switch ticker pill bar (`[ NVDA ] [ AAPL ] [ MSFT ] [ TSLA ] [ AMZN ] [ HSBA.L ]`).
   - Live system telemetry badges for FastAPI, Redis/Celery, and active market providers.
   - Slide-out `WatchlistDrawer` with multi-stock quotes.
2. **TradingView Lightweight Charts v4 Upgrade (`CandlestickChart.tsx`):**
   - Clean OHLC validation and time-series sorting.
   - Candlestick, Line, and Area mode toggles.
   - Range selection pills: 1W, 1M, 3M, 6M, 1Y, ALL.
   - Volume histogram overlay below candles with green/red bars.
   - Moving average overlays (SMA 50 in cyan, SMA 200 in amber).
   - Toggleable RSI (14) sub-panel with 70 overbought and 30 oversold dashed reference lines.
   - Real-time hover tooltip displaying Open, High, Low, Close, Volume, and Change %.
3. **3D Global Telemetry (`GlobalMarketGlobe3D.tsx`):**
   - Three.js WebGL interactive 3D globe with major financial center markers (NYC, London, Tokyo, Zurich, Frankfurt, Singapore) and connecting liquidity arcs.
   - Automatic fallback for devices with reduced motion preferences or lacking WebGL.

---

## 5. Summary of Files Touched

| File Path | Type | Nature of Change |
| :--- | :--- | :--- |
| `pyproject.toml` | Backend Config | Added `pythonpath = ["."]` for out-of-the-box pytest execution |
| `src/backend/data_ingestion/base.py` | Core Model | Added `NormalizedInstrument` domain model |
| `src/backend/services/instrument_service.py` | New Service | Canonical universe, multi-stock search, and watchlist aggregator |
| `src/backend/api/v1/market_data.py` | API Router | Added `/search`, `/instruments`, and `/watchlist` routes |
| `src/backend/main.py` | Application Factory | Added database instrument auto-seeding on startup |
| `src/backend/data_ingestion/router.py` | Routing Engine | Fixed UK ticker handling (`.L` / `.LON`) and ADR preservation |
| `src/backend/sandbox/executor.py` | Security Sandbox | Dunder attribute blocking, JSON extraction, and tree-kill |
| `src/backend/ai/context.py` | New AI Module | Conversation context and session memory management |
| `src/backend/ai/policy.py` | New AI Module | Tool permission and input validation engine |
| `src/backend/ai/tools/registry.py` | AI Tool Engine | Registered 13 typed tools with async execution handlers |
| `src/backend/ai/orchestrator.py` | New AI Module | Modular AI orchestration layer |
| `src/backend/ai/agent.py` | AI Facade | Maintained backwards compatibility while delegating to orchestrator |
| `src/backend/api/v1/jobs.py` | API Router | Added `/health` diagnostic endpoint checking Redis & Celery |
| `src/frontend/package.json` | Frontend Dependencies | Added `three` and `@types/three` |
| `src/frontend/src/api/client.ts` | Frontend API | Added `searchInstruments`, `fetchWatchlist`, `fetchWorkerHealth` |
| `src/frontend/src/components/CandlestickChart.tsx` | Chart Component | Upgraded TradingView chart with volume, RSI, modes, and tooltips |
| `src/frontend/src/components/WatchlistDrawer.tsx` | New Component | Multi-stock slide-out watchlist drawer |
| `src/frontend/src/components/GlobalMarketGlobe3D.tsx` | New Component | Interactive Three.js 3D global financial network |
| `src/frontend/src/components/AppShell.tsx` | Layout Shell | Redesigned institutional shell with search, quick pills, telemetry |
| `src/frontend/src/App.tsx` | App Root | Multi-stock symbol state propagation across all views |
| `src/frontend/src/views/MarketResearch.tsx` | View | Added 3D globe, symbol sync, and error states |
| `src/frontend/src/views/TechnicalStudio.tsx` | View | Added symbol sync and enhanced candlestick integration |
| `src/frontend/src/views/NewsTerminal.tsx` | View | Added symbol sync |
| `src/frontend/src/views/JobsMonitor.tsx` | View | Added symbol sync |
| `src/frontend/src/views/ChatWorkspace.tsx` | View | Enhanced inline candlestick rendering with symbol tag |
| `tests/unit/test_instrument_search.py` | New Test Suite | 6 unit tests covering universe, search, ADRs, watchlist |
| `tests/unit/test_sandbox.py` | Test Suite | Added JSON extraction and dunder rejection tests |
| `tests/integration/test_e2e_api.py` | Integration Tests | Added E2E search, watchlist, and jobs health tests |
