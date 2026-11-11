# INKVECTOR — Global Stock & AI Scenario Testing Documentation

## 1. Automated Acceptance Test Suite (Tests A–H)

The test suite in `tests/test_global_stock_and_scenarios.py` verifies the complete end-to-end functionality of INKVECTOR across the 8 primary acceptance requirements:

```cmd
pytest tests/test_global_stock_and_scenarios.py -v
```

### Verified Test Results Summary

```
============================= test session starts =============================
platform win32 -- Python 3.14.10, pytest-9.2.0, pluggy-1.7.0
rootdir: E:\finTech-inkVector
plugins: anyio-4.16.0, asyncio-1.4.1.post1
collected 8 items

tests/test_global_stock_and_scenarios.py::test_a_global_stock_discovery PASSED [ 12%]
tests/test_global_stock_and_scenarios.py::test_b_multi_provider_price_retrieval_and_provenance PASSED [ 25%]
tests/test_global_stock_and_scenarios.py::test_c_ai_stock_comparison PASSED [ 37%]
tests/test_global_stock_and_scenarios.py::test_d_buy_sell_scenario_simulation PASSED [ 50%]
tests/test_global_stock_and_scenarios.py::test_e_multi_source_sentiment PASSED [ 62%]
tests/test_global_stock_and_scenarios.py::test_f_celery_and_redis_background_processing PASSED [ 75%]
tests/test_global_stock_and_scenarios.py::test_g_chat_response_reliability PASSED [ 87%]
tests/test_global_stock_and_scenarios.py::test_h_portfolio_multi_currency_and_concentration PASSED [100%]

============================= 8 passed in 32.89s ==============================
```

---

## 2. Test Case Breakdown

### Test A: Global Stock Discovery
- **Scope:** Verifies that searching for US, UK, Japan, and Switzerland equities correctly resolves ticker symbols, legal company names, MIC codes, and currencies.
- **Evidence:** `NVDA` (NASDAQ, USD), `HSBA.L` (XLON, GBP), `7203.T` (XJPX, JPY), `NESN.SW` (XSWX, CHF) all resolved with 100% precision. Paginated catalog returns verified 10-item slices.

### Test B: Multi-Provider Price Retrieval & Provenance
- **Scope:** Verifies real-time quote generation returns strictly positive prices, real timestamps, and valid provider tags.
- **Evidence:** Quote for `AAPL` returned `$354.25` via `twelve_data` with freshness `REAL_TIME`.

### Test C: AI Multi-Stock Comparison
- **Scope:** Tests natural language query *"Compare NVIDIA and AMD"* through intent classification, concurrent tool execution, and Markdown matrix synthesis.
- **Evidence:** Extracted `['NVDA', 'AMD']`, classified intent `STOCK_COMPARISON`, executed `compare_stocks` tool, and generated side-by-side valuation, technicals, and sentiment comparison.

### Test D: Buy/Sell Scenario Simulation
- **Scope:** Simulates: *"If I sell my Tesla holdings and invest 60% in NVIDIA and 40% in AMD"*.
- **Evidence:** Natural language parser extracted `sell TSLA (all)` and `buy NVDA (60%), AMD (40%)`. Simulated portfolio NAV shifted from baseline with itemized receipts, updated HHI index, and explicit regulatory disclosures.

### Test E: Multi-Source Sentiment Analysis
- **Scope:** Ingests financial news articles and computes sentiment polarity score and label.
- **Evidence:** Evaluated `NVDA` sentiment; score fell within valid $[-1.0, +1.0]$ bounds with bullish/bearish/neutral label.

### Test F: Celery and Redis Background Processing
- **Scope:** Tests round-trip queueing through native Windows Redis broker into Celery worker.
- **Evidence:** `ping_system.delay(...)` task enqueued on port 6379, processed by worker in `solo` mode, and reached `SUCCESS` state in 0.005 seconds.

### Test G: Chat Response Reliability
- **Scope:** Submits multiple complex analytical prompts to verify no blank responses or unhandled exceptions occur.
- **Evidence:** All queries returned structured, grounded financial markdown answers exceeding 30 characters without errors.

### Test H: Portfolio Multi-Currency & Concentration
- **Scope:** Ingests mixed-currency portfolio (`NVDA` in USD, `HSBA` in GBP), applies live ECB FX rates, and calculates Herfindahl Index.
- **Evidence:** Weights summed to 100%, non-USD assets converted to base, and concentration level categorized accurately.
