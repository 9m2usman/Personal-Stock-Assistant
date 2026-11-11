# INKVECTOR — FRONTEND AND INTEGRATION VERIFICATION

## 1. Automated Verification Suite

### 1.1 Frontend Typecheck & Production Build
Executed with TypeScript strict checking and Vite asset pipeline:
```powershell
cd src/frontend
npm run build
```
- **Result**: `Exit code 0`
- **Output**:
  - `dist/index.html`: 0.62 kB
  - `dist/assets/index-*.css`: 50.96 kB (gzip 9.27 kB)
  - `dist/assets/index-*.js`: 1,555.76 kB (gzip 416.68 kB)
  - 2,541 modules transformed with zero TypeScript errors.

### 1.2 Backend Test Suite
Executed full backend test suite via pytest:
```powershell
python -m pytest tests/
```
- **Result**: `53 passed in 28.55s`
- **Coverage**:
  - `tests/integration/test_e2e_api.py`: 6 tests passing (root health, quotes, history, technicals, sandbox, AI chat).
  - `tests/unit/test_ai_agent.py`: 3 tests passing.
  - `tests/unit/test_config.py`: 3 tests passing.
  - `tests/unit/test_database.py`: 1 test passing.
  - `tests/unit/test_exceptions.py`: 3 tests passing.
  - `tests/unit/test_fundamental_service.py`: 3 tests passing (SEC XBRL parser, ratios).
  - `tests/unit/test_health.py`: 3 tests passing.
  - `tests/unit/test_instrument_search.py`: 6 tests passing (MIC resolution, multi-instrument search).
  - `tests/unit/test_news_service.py`: 2 tests passing (Loughran-McDonald sentiment scores).
  - `tests/unit/test_portfolio_service.py`: 2 tests passing (Excel/CSV parsing, ECB FX normalization, HHI).
  - `tests/unit/test_providers.py`: 4 tests passing.
  - `tests/unit/test_sandbox.py`: 7 tests passing (Python subprocess isolation, timeouts, safety filters).
  - `tests/unit/test_technical_service.py`: 8 tests passing (SMA, EMA, RSI, MACD, Bollinger Bands).
  - `tests/unit/test_workers.py`: 2 tests passing (Celery background tasks, rebalance simulations).

---

## 2. Interactive Manual Verification Checklist

1. **Authentication Flow (Screen 1)**:
   - Click "Sign In" in top header or profile menu.
   - Verified modal opens with 3D glass geometry on desktop.
   - Tested password length validation and institutional demo bypass.
2. **Onboarding Wizard (Screen 2)**:
   - Tested multi-step wizard: Step 1 Intro -> Step 2 Currency (USD/EUR/GBP/JPY/CHF) -> Step 3 Market hubs -> Step 4 Optional spreadsheet -> Step 5 Watchlist selection -> Step 6 Confirmation.
   - Verified preferences persist in `localStorage`.
3. **Overview Dashboard (Screen 3)**:
   - Verified major index widgets (S&P 500, Nasdaq, FTSE, Nikkei, DAX, SMI) render with EOD/delayed badges.
   - Verified TradingView lightweight chart renders candlesticks and responds to timeframe controls.
   - Verified 3D globe toggle button.
4. **Markets Discovery (Screen 4)**:
   - Tested multi-stock search by name and ticker (NVDA, Apple, HSBA, 7203).
   - Tested exchange filters (NASDAQ, NYSE, London, Tokyo, SIX, Frankfurt).
   - Tested Primary vs ADR badge filters.
5. **Stock Detail Studio (Screen 5)**:
   - Navigated across all 6 tabs (Overview, Candlestick Studio, 3 Statements, Technical Signals, News, AI Research).
   - Verified 3-statement tables (Income Statement, Balance Sheet, Cash Flow) show correct fiscal periods.
   - Verified RSI and SMA values calculate and display.
6. **Watchlists Manager (Screen 6)**:
   - Tested switching between named watchlists.
   - Tested adding new securities via live autocomplete search.
   - Tested removing securities.
7. **Portfolio & Excel Ingestion (Screen 7)**:
   - Tested "Load Sample Tech Portfolio".
   - Verified live valuation, unrealized P/L, HHI index calculation, and Recharts pie asset allocation.
   - Tested What-If stress test shock buttons (-10% market drop, +15% rally).
   - Tested AI Portfolio Review button calling the real AI harness.
8. **Research & Peer Comparison (Screen 8)**:
   - Tested side-by-side comparison matrix for NVDA, AAPL, MSFT.
   - Verified comparative gross margin and ROE bar chart.
9. **News Terminal (Screen 9)**:
   - Tested search for tickers and corporate topics.
   - Verified polarity gauge (Bullish/Neutral/Bearish) and sample breakdown.
10. **AI Financial Assistant (Screen 10)**:
    - Verified 3D neural mesh visualizer transitions to active state during request execution.
    - Verified multi-step pipeline status updates.
    - Verified grounded response synthesis with tool citations.
11. **Analysis Lab (Screen 11)**:
    - Executed Python quantitative volatility script in the sandbox.
    - Verified standard output and execution duration.
    - Tested dispatching background Celery research task with real-time status polling.
12. **Saved Research (Screen 12)**:
    - Tested filtering by category and searching saved dossiers.
    - Tested downloading markdown research reports.
13. **Settings (Screen 13)**:
    - Tested switching between Dark Fintech and Light Studio themes.
    - Tested changing base accounting currency.
    - Verified status of all 6 configured market data providers.

---

## 3. Local Execution Guide

To run the complete INKVECTOR application locally:

### Option A: Standard Two-Terminal Execution

#### Terminal 1 — FastAPI Backend:
```powershell
# In repository root:
python -m uvicorn src.backend.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Terminal 2 — React Frontend:
```powershell
cd src/frontend
npm run dev
```
Open browser at `http://localhost:5173`.

### Option B: Automated Batch Scripts
Double-click `start_backend.bat` and `start_frontend.bat` in the repository root.
