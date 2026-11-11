# INKVECTOR: Global Stock, Financial AI, Multi-Provider & Infrastructure Audit

**Document Version:** 1.0.0  
**Audit Date:** November 11, 2026  
**Audited System:** INKVECTOR AI Stock Market Assistant & Financial Intelligence Platform  
**Target Directory:** `E:\finTech-inkVector`  

---

## Executive Summary

An exhaustive technical audit of the INKVECTOR repository was conducted across its financial data ingestion layer, instrument master registry, AI agent harness, calculation engines, background task queue (Celery/Redis), and frontend workspaces.

The audit revealed three critical architectural bottlenecks preventing the system from operating as an institutional financial platform:
1. **Instrument Master Artificially Constrained:** The instrument catalog was limited to a hardcoded dictionary (`INSTITUTIONAL_UNIVERSE` in `instrument_service.py`) containing only 12 instruments, ignoring available provider reference endpoints (e.g. SEC EDGAR's 10,405 public companies, Twelve Data's 4,500+ NASDAQ tickers, FMP stable search directories).
2. **AI Agent Inability to Handle Complex Workflows:** Intent classification only mapped single symbols to basic checks (`PRICE_CHECK`, `TECHNICAL_ANALYSIS`, `FUNDAMENTAL_ANALYSIS`). Intent categories for **Hypothetical Buy/Sell Scenario Simulation** and **Multi-Stock Comparative Analysis** were completely absent. When asked portfolio reallocation or comparison questions, the assistant returned boilerplate text or fell back to single-ticker lookups.
3. **Redis & Background Worker Disconnect:** Redis was not natively running on the Windows host on port 6379, causing background tasks to fall back to eager execution (`CELERY_TASK_ALWAYS_EAGER=True`) without persistent async queuing.

---

## 1. Instrument Master & Global Stock Coverage

### 1.1 Why Only a Few Stocks Appear
- **Current State:** The Markets Discovery and Watchlist interfaces only surface 6–12 instruments (e.g. `NVDA`, `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `TSLA`, `AMD`, `AVGO`, `JPM`, `HSBA.L`, `7203.T`, `NESN.SW`, `TM`, `NSRGY`).
- **Actual Root Cause:** In `src/backend/services/instrument_service.py`, `InstrumentService.__init__` instantiates its internal catalog solely from an in-memory Python list `INSTITUTIONAL_UNIVERSE`. The database seed routine (`seed_database_if_empty`) only populates this exact hardcoded list. No automated synchronization routine pulled from external symbol reference endpoints.
- **Evidence:** `src/backend/services/instrument_service.py` lines 24–251 hardcodes `INSTITUTIONAL_UNIVERSE: List[Dict[str, Any]] = [...]` with exactly 15 dictionary entries.
- **Priority:** **P0 (Critical)**
- **Recommended Fix:** Implement a centralized `NormalizedInstrumentMaster` with database persistence, pulling from SEC EDGAR's authoritative `company_tickers.json` (10,405+ tickers), Twelve Data's `/stocks` reference API (4,522 NASDAQ + NYSE/LSE tickers), and FMP's `/stable/search-name` dynamic lookup. Add database upserting, pagination, exchange validation, and country/currency filtering.

### 1.2 Company vs. Instrument Distinction (Primary vs. ADR)
- **Current State:** The system preserves explicit distinctions between UK primary (`HSBA.L` on XLON in GBP) and US ADR (`TM` on NYSE in USD vs `7203.T` on Tokyo in JPY), but this modeling is manual.
- **Actual Root Cause:** Lack of automated company-to-multiple-listings relational schema.
- **Evidence:** Manual mapping in `INSTITUTIONAL_UNIVERSE` with `related_adr_symbol: "TM"` and `is_adr: False` for `7203.T`.
- **Priority:** **P1**
- **Recommended Fix:** Enhance the database model with an explicit `Company` parent entity and multiple `Instrument` children, linked by `company_id`, `is_primary`, `is_adr`, and `primary_instrument_id`.

---

## 2. Multi-Provider Data Engine Audit

### 2.1 Provider Status Matrix

| Provider | Configured Key | Endpoint Status | Verified Endpoints | Restrictions / Notes |
| :--- | :---: | :---: | :--- | :--- |
| **Twelve Data** | **YES** | **ACTIVE** | `/quote`, `/time_series`, `/stocks?exchange=NASDAQ` (4,522 stocks) | Free tier rate-limited (8 credits/min). Bulk global `/stocks` times out without exchange filter. |
| **FMP** | **YES** | **ACTIVE** | `/stable/search-name` (200 OK), `/stable/profile`, `/stable/income-statement`, `/stable/balance-sheet-statement`, `/stable/cash-flow-statement` | `/stable/stock-list` returns 402 (restricted on free plan). All `/stable/` company profile and financial statements work. |
| **Alpha Vantage** | **YES** | **ACTIVE** | `SYMBOL_SEARCH` (200 OK), `TIME_SERIES_DAILY` (compact 100 observations), LSE equities (`.LON`) | 25 requests/day ceiling. Must cache aggressively. |
| **SEC EDGAR** | **N/A (Public)** | **ACTIVE** | `company_tickers.json` (10,405 US companies), `/api/xbrl/companyfacts/CIK{cik}.json` | Free public API, requires `User-Agent: InkVectorResearch/1.0`. Contains filings and XBRL facts, not real-time price quotes. |
| **Nasdaq Data Link** | **YES** | **INVESTIGATED** | `datatables/SHARADAR/SEP.json` (200 OK with custom User-Agent) | Default httpx User-Agent was blocked with 403 by Incapsula/Imperva WAF on `datasets.json`. Custom User-Agent succeeds (HTTP 200). `WIKI/*` is discontinued. |
| **NewsAPI** | **YES** | **ACTIVE** | `/v2/everything` (200 OK) | Free developer tier restricted to articles published within last 30 days. |

- **Root Cause of Previous Nasdaq 403:** The previous test suite executed requests with default Python HTTP headers, triggering Cloudflare/Incapsula bot mitigation. Passing a legitimate User-Agent resolves the 403 block on valid endpoints like SHARADAR.
- **Priority:** **P0**
- **Recommended Fix:** Provide a resilient `NasdaqDataAdapter` with proper header spoofing prevention, handle rate limits, and wire into provider failover router.

---

## 3. Financial AI Agent Audit

### 3.1 Why Buy/Sell Questions Fail
- **Current State:** Asking *"If I sell all my Tesla shares and buy NVIDIA and AMD, what will my portfolio look like?"* triggers a canned response: *"I support automated spreadsheet ingestion... Upload your spreadsheet in the Portfolio & Excel tab"*.
- **Actual Root Cause:** 
  1. `FinancialIntent` enum in `src/backend/ai/intent.py` lacked a `SCENARIO_SIMULATION` intent.
  2. Keywords `"sell"` and `"buy"` were stripped out as stopwords (`src/backend/ai/intent.py:85`).
  3. `AIOrchestrator` in `src/backend/ai/orchestrator.py` had no tool or workflow to parse reallocation legs (Source Ticker -> Proceeds -> Target Tickers -> Weightings) and compute the resulting portfolio.
- **Priority:** **P0 (Critical)**
- **Recommended Fix:** Add `FinancialIntent.SCENARIO_SIMULATION`, author a dedicated `ScenarioParser` to extract sell/buy legs, wire into a mathematical `ScenarioEngine`, and return structured `SCENARIO_COMPARISON` widgets.

### 3.2 Why Comparison Questions Fail
- **Current State:** Asking *"Compare NVIDIA and AMD, analyze their fundamentals and tell me which looks more attractive"* only pulled data for `NVDA` and ignored `AMD`, returning a single-ticker fundamental card.
- **Actual Root Cause:** `AIOrchestrator.run()` selected `active_symbol = symbols[0]` and executed tools solely for the first extracted ticker, discarding subsequent symbols.
- **Priority:** **P0 (Critical)**
- **Recommended Fix:** Implement `FinancialIntent.STOCK_COMPARISON` multi-symbol tool dispatching: concurrently fetch quotes, fundamentals, technicals, and news sentiment for all extracted symbols, compute side-by-side metric deltas, and produce a unified comparison table widget.

---

## 4. News & Sentiment Analysis Audit

### 4.1 Single-Source Dependency
- **Current State:** News sentiment relies exclusively on NewsAPI's `/v2/everything` endpoint with a single lexicon dictionary.
- **Actual Root Cause:** No news aggregation pipeline combining NewsAPI, company press releases, and SEC 8-K / 6-K filing disclosures. Duplicate syndications across news outlets are counted multiple times.
- **Priority:** **P1**
- **Recommended Fix:** Author a multi-source news pipeline:
  1. Ingest from NewsAPI + Provider News feeds.
  2. Normalize title and URL hashes to eliminate duplicate syndicated wire stories.
  3. Score sentiment with company-specific financial polarity weighting.
  4. Expose source diversity and article counts transparently.

---

## 5. Redis & Celery Infrastructure Audit

### 5.1 Redis Host Status
- **Current State:** No Redis or Memurai service was listening on `127.0.0.1:6379` on this Windows machine.
- **Actual Root Cause:** Windows does not ship with a native Redis service. WSL2 or standalone Windows binaries are required.
- **Evidence:** `socket.connect_ex(('127.0.0.1', 6379))` returned `False`.
- **Priority:** **P0**
- **Recommended Fix:** Provide portable Redis for Windows in `tools/redis/` (using official MS/tporadowski x64 binaries) with automated startup scripts (`start_redis.bat`), allowing zero-admin local execution on port 6379.

### 5.2 Celery Configuration & Task Persistence
- **Current State:** Celery is configured in `src/backend/workers/celery_app.py` with eager execution fallback (`task_always_eager = True` if Redis ping fails).
- **Actual Root Cause:** When Redis is offline, tasks execute synchronously within the FastAPI worker rather than in an isolated background process.
- **Priority:** **P0**
- **Recommended Fix:** Verify real Redis connection, start a standalone Celery worker (`celery -A src.backend.workers.celery_app worker -P solo -l info`), and verify end-to-end task submission, Redis message routing, and result storage.

---

## 6. Frontend Integration Gaps

### 6.1 Markets Discovery
- Markets page was displaying a limited static slice of stocks.
- **Fix:** Connect to new paginated `/api/v1/market/instruments` endpoint supporting full text search, exchange filters (NASDAQ, NYSE, LSE, TSE, SIX), country filters, and data availability indicators.

### 6.2 Portfolio Scenario Simulator
- Portfolio page had what-if market shock sliders (-40% to +40%), but lacked a conversational buy/sell rebalancing interface.
- **Fix:** Build an interactive Buy/Sell Scenario Simulator component allowing users to define sell orders and buy allocations, visualize side-by-side before/after NAV, cash balance, and HHI concentration shifts.

---

## Audit Signoff & Remediation Roadmap
- **Phase 0:** Complete Audit (`docs/GLOBAL_STOCK_AI_INFRASTRUCTURE_AUDIT.md`) — **COMPLETE**
- **Phase 1:** Centralized Instrument Master & Global Stock Catalogue Sync — **IN PROGRESS**
- **Phase 2:** Multi-Provider Data Engine & Capability Registry
- **Phase 3:** Redis Service & Celery End-to-End Verification
- **Phase 4:** Financial Calculation & Buy/Sell Portfolio Scenario Engine
- **Phase 5:** Advanced Financial AI Agent (Comparison & Scenarios)
- **Phase 6:** Multi-Source News & Sentiment Intelligence
- **Phase 7:** Frontend Integration & Rich Interactive Widgets
- **Phase 8:** Automated Test Verification & Documentation
