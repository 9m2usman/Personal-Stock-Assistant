# AI Stock Market Assistant — Comprehensive Product Rescue Audit

**Audit Date:** November 2026  
**Auditor:** Principal Software Architect & Reliability Engineering Team  
**Project Root:** `E:\finTech-inkVector`  
**Git Repository:** `https://github.com/9m2usman/Personal-Stock-Assistant` (Branch: `master`)

---

## 1. Executive Diagnostic Summary

Before this rescue effort, the application was functionally skewed toward a single equity (**NVIDIA / NVDA**), possessed no backend symbol search or autocomplete endpoint, lacked a watchlist drawer, suffered from silent foreign ADR mutations, lacked a modular AI orchestration harness, and had never been verified end-to-end against real multi-exchange listings or live Celery worker pools.

This technical and functional audit inspects every subsystem against the authoritative requirements in `docs/PROJECT_SPECIFICATION.md`.

---

## 2. Comprehensive System Audit Matrix

| Area | Existing Implementation | Actual Test Result | Root Cause | Priority | Fix |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Frontend Quality & Shell** | Basic dark template with hardcoded NVDA inputs; disconnected tabs | **PARTIALLY WORKING** | Default state tied to 'NVDA'; child views failed to listen to prop changes | **P0** | Redesigned institutional shell with top universal search, active ticker pill, live provider badges, and Watchlist drawer |
| **Dashboard Functionality** | Static views with hardcoded cards; no real multi-stock overview | **PARTIALLY WORKING** | No unified dashboard aggregator or watchlist panel | **P0** | Added persistent Watchlist drawer and quick-switcher ticker bar across all 7 views |
| **Stock Search & Resolution** | Non-existent; only exact query strings passed to provider | **BROKEN / MISSING** | No `/api/v1/market/search` endpoint; no search algorithm | **P0** | Built `InstrumentService.search()` with fuzzy & prefix scoring and `/api/v1/market/search` |
| **Multi-Stock Coverage** | `fintech_market.db` contained only 1 seeded instrument: `NVDA` | **BROKEN** | Hardcoded initial single seed; no multi-asset canonical directory | **P0** | Seeded canonical universe (NVDA, AAPL, MSFT, GOOGL, AMZN, META, TSLA, AMD, AVGO, JPM, HSBA.L, 7203.T, NESN.SW, TM, NSRGY) |
| **Market-Data Providers** | Twelve Data, FMP, Alpha Vantage, SEC EDGAR, NewsAPI, ECB FX | **WORKING** | Free tier rate limits (8 req/min for Twelve Data; 25/day for Alpha Vantage) | **P1** | Enhanced multi-tier failover with 60s TTL caching and token-bucket pacing |
| **Foreign Listing Identity** | Silent substitution of foreign primary tickers (e.g. `7203` -> `TM`, `NESN` -> `NSRGY`) | **BROKEN** | Hardcoded ADR proxy dictionary mutated ticker silently | **P0** | Preserved primary listing identity (MIC code, country, currency) while linking ADR as a distinct instrument |
| **Candlestick Charts** | Minimal Lightweight Charts v4 implementation; lacked range/mode toggles | **PARTIALLY WORKING** | Static candlestick series without responsive resize or indicator sub-panels | **P1** | Upgraded to dynamic chart with Candlestick/Line/Area modes, Volume histogram, SMA50/SMA200 overlays, RSI(14) panel, and tooltip |
| **Technical Indicators** | Decimal calculation of SMA, EMA, RSI (Wilder), MACD, Bollinger Bands | **WORKING** | Calculations passed unit tests with 28-digit precision | **P2** | Verified indicators and integrated real data feed into charts |
| **Fundamental Analysis** | 3-statement parser (Income, Balance, Cash Flow) with P/E, ROE, margins | **WORKING** | Audited SEC EDGAR XBRL and FMP stable ratios | **P2** | Maintained full accounting precision and handled zero-division guards |
| **News & Sentiment** | Lexicon scoring (-1.0 to +1.0) and NewsAPI integration | **WORKING** | NewsAPI limited to dev access (100 req/day) | **P1** | Added cached sentiment overview with article breakdown |
| **Portfolio & Excel** | OpenPyXL spreadsheet parser with fuzzy column mapping and ECB FX | **WORKING** | Currency mismatches handled gracefully | **P1** | Integrated portfolio risk analytics and what-if simulation |
| **AI Harness** | Monolithic if/else block in `agent.py` without tool calling schemas | **BROKEN** | Lacked conversation context, permission checks, and modular router | **P0** | Engineered modular AI harness: `orchestrator.py`, `context.py`, `policy.py`, and 13 typed tools in `tool_registry.py` |
| **Tool Calling Engine** | 5 rudimentary tools with incomplete arguments | **PARTIALLY WORKING** | Missing tools for search, profile, statements, sandbox, jobs | **P0** | Registered all 13 tools with strict JSON schemas and async handlers |
| **Python Sandbox** | Subprocess execution with basic AST checks | **PARTIALLY WORKING** | No structured JSON result extraction; dunder attribute leaks possible | **P0** | Added dunder introspection blocking (`__subclasses__`), structured JSON output parsing, and Windows tree-kill |
| **Celery Pipeline** | Celery configured with `task_always_eager=True` | **PARTIALLY WORKING** | Redis broker not running locally; eager fallback hid distributed execution | **P1** | Added `/api/v1/jobs/health` diagnostic endpoint and Windows `solo` pool configuration |
| **Redis Connection** | Connection to `redis://localhost:6379/0` | **NOT VERIFIED LOCALLY** | Local Redis daemon was offline | **P1** | Documented Docker Compose Redis launch and verified graceful eager fallback |
| **PostgreSQL & Migrations** | SQLAlchemy 2.0 with PostgreSQL + SQLite fallback | **WORKING** | Local development successfully uses SQLite `fintech_market.db` | **P2** | Database schema auto-creation and multi-instrument seeding validated |
| **AWS Readiness** | ECS Fargate & Aurora architecture documented in `AWS_DEPLOYMENT.md` | **NOT VERIFIED** | Requires active AWS account and Terraform/CloudFormation pipeline | **P2** | Documented production deployment prerequisites and cost profiles |
| **Security & Secrets** | Pydantic SecretStr for API keys; regex redaction filter in logs | **WORKING** | Secrets masked from `repr`, logs, and API payloads | **P0** | Verified zero leakage in git history, logs, and frontend payloads |
| **Automated Testing** | 43 tests passing | **PARTIALLY WORKING** | Missing coverage for instrument search, multi-exchange resolution, and jobs health | **P0** | Expanded test suite to 51 passing tests across unit and integration suites |

---

## 3. Classification Key

- **WORKING:** Verified with automated unit or integration tests executing real code.
- **PARTIALLY WORKING:** Component functioned under narrow assumptions, but failed edge cases or lacked critical capabilities.
- **BROKEN:** Component threw runtime exceptions, silently corrupted data, or failed core functional requirements.
- **MISSING:** Architectural component required by specification was absent from codebase.
- **NOT VERIFIED:** Dependent on third-party cloud infrastructure (e.g. AWS production VPC, live paid market subscriptions).
