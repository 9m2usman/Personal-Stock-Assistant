# AI Stock Market Assistant

[![GitHub Repository](https://img.shields.io/badge/GitHub-Personal--Stock--Assistant-181717?style=flat&logo=github)](https://github.com/9m2usman/Personal-Stock-Assistant)
[![Python Version](https://img.shields.io/badge/python-3.12%20%7C%203.14-blue.svg)](https://www.python.org/)
[![React Version](https://img.shields.io/badge/react-19.0.0-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![TradingView Lightweight Charts](https://img.shields.io/badge/Charts-Lightweight--Charts%204.2-2962FF.svg)](https://tradingview.github.io/lightweight-charts/)
[![Tests Passing](https://img.shields.io/badge/tests-43%20passed-brightgreen.svg)](tests/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

An institutional-grade financial research, quantitative stock analysis, and portfolio intelligence platform. Powered by **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL 16**, **Redis 7**, **Celery 5.7**, and a modern **React 19 / TypeScript** frontend featuring a dual-engine charting architecture:
1. **TradingView Lightweight Charts:** High-performance HTML5 Canvas rendering for real-time candlestick charts and quantitative indicator overlays (SMA 50, SMA 200, Bollinger Bands, RSI).
2. **Recharts:** High-fidelity SVG rendering for asset allocation donut charts, performance waterfalls, and risk gauges.

---

## Architecture Overview

```
                                      +------------------------------------+
                                      |   React 19 / TypeScript SPA (Vite) |
                                      |   TradingView Charts & Recharts UI |
                                      +-----------------+------------------+
                                                        |
                                       +----------------+----------------+
                                       |     FastAPI Backend Gateway     |
                                       |     (Async ASGI Router v1)      |
                                       +----------------+----------------+
                                                        |
         +----------------------------------------------+----------------------------------------------+
         |                                              |                                              |
+--------v--------+                            +--------v--------+                            +--------v--------+
|   PostgreSQL    |                            |  Redis 7 Cache  |                            | Isolated Python |
|  Async ORM 2.0  |                            | & Celery Broker |                            | Analytical Box  |
+-----------------+                            +--------+--------+                            +-----------------+
                                                        |
                                               +--------v--------+
                                               |  Celery Workers |
                                               | (Async Reports) |
                                               +-----------------+
```

---

## 7 Core Analytical Workspaces

1. **Conversational AI Research Assistant:** Natural language financial intent classifier (`PRICE_CHECK`, `TECHNICAL_ANALYSIS`, `FUNDAMENTAL_ANALYSIS`, `NEWS_SENTIMENT`, `PORTFOLIO_QUERY`) returning grounded facts with interactive dynamic UI widgets (`QUOTE_CARD`, `CANDLESTICK_CHART`, `FUNDAMENTAL_CARD`, `NEWS_FEED`).
2. **Stock & Enterprise Research:** Company dossiers, sector breakdown, P/E ratios, and audited 3-statement tables (Income Statement, Balance Sheet, Cash Flow) from official SEC EDGAR XBRL facts and FMP `/stable/`.
3. **Quantitative Technical Studio:** Interactive TradingView Canvas chart with 28-digit arbitrary precision SMA, EMA, Wilder 14-day smoothed RSI, MACD histograms, Bollinger Bands, and annualized volatility.
4. **Excel Portfolio Integration:** Drag-and-drop ingestion of `.xlsx` and `.csv` files with fuzzy column matching, spot European Central Bank FX conversion, Herfindahl-Hirschman Index (HHI) concentration diagnostics, and diversification alerts.
5. **What-If Scenario & Stress Testing Lab:** Interactive macroeconomic shock simulator (-40% to +40%), capital injection modeling, position re-allocation deltas, and portfolio turnover projections.
6. **Financial News & Sentiment Intelligence:** NewsAPI stream with domain-specific financial lexicon scoring (-1.0 to +1.0) and Bullish/Bearish polarity metrics.
7. **Task Worker Monitor:** Celery distributed queue dashboard for monitoring background deep equity research dossiers and batch market quotes.

---

## Validated Financial Data Providers

| Provider | Supported Asset Classes | Rate Limits | Freshness | Primary Role |
| :--- | :--- | :--- | :--- | :--- |
| **Twelve Data** | US Equities & ETFs (`NVDA`, `AAPL`) | 8 req/min (800/day) | Real-time / 15m Delayed | Primary real-time quotes & intraday series |
| **Financial Modeling Prep** | US Equities & ADRs (`/stable/` routes) | 300 req/min (250/day) | End of Day | 3-Statement audited financials & ratios |
| **Alpha Vantage** | UK / LSE Equities (`.LON` in GBp) | 5 req/min (25/day) | End of Day (100 obs) | London Stock Exchange feed & compact history |
| **SEC EDGAR** | US Public Filers & 20-F ADRs | 10 req/sec | Official Filings | Authoritative GAAP/IFRS XBRL financial facts |
| **NewsAPI** | Global Financial Media | 100 req/day | Real-time Stream | Breaking headlines & sentiment analysis |
| **European Central Bank** | Major Global Currencies | Unmetered (Free) | Daily Reference | Spot FX conversion to base currency (`USD`/`EUR`) |

---

## Quickstart Guide

### Option 1: Docker Compose (Recommended)
Launch the entire production-ready stack (FastAPI, React Frontend, Celery Worker, PostgreSQL 16, Redis 7) with a single command:
```bash
docker compose up --build
```
- **Web Dashboard:** `http://localhost:3000`
- **FastAPI Documentation:** `http://localhost:8000/docs`

---

### Option 2: Local Development Setup

#### 1. Configure Environment
```bash
cp .env.example .env
```
Ensure your `.env` contains your API credentials (the application will run in local demo mode if keys are omitted).

#### 2. Run Backend
```bash
# Install Python dependencies
pip install -e .

# Start FastAPI server
uvicorn src.backend.main:app --reload --port 8000
```

#### 3. Run Frontend
```bash
cd src/frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

#### 4. Launch Sample Excel Portfolio
Upload the sample portfolio located at `examples/sample_portfolio.xlsx` directly into the **Portfolio & Excel** workspace to test multi-currency valuation and HHI risk concentration.

---

## Automated Test Suite

Run the full unit and end-to-end integration test suite:
```bash
python -m pytest tests -v
```
```
======================== 43 passed in 8.21s ========================
- Unit Tests: 39 passed (Config, DB, Exceptions, Fundamentals, News, Portfolio, Providers, Sandbox, Technicals, Workers)
- Integration Tests: 4 passed (Health E2E, Sandbox E2E, Portfolio Simulation E2E, Chat Flow E2E)
```

---

## Production Cloud Deployment (AWS)

For full infrastructure-as-code and architectural blueprints covering **AWS ECS Fargate**, **Aurora PostgreSQL Serverless v2**, **ElastiCache Redis**, and **CloudFront CDN**, consult:
- **[AWS Cloud Deployment Blueprint](docs/AWS_DEPLOYMENT.md)**
- **[Master Development Progress](docs/DEVELOPMENT_PROGRESS.md)**
- **[Project Specification](docs/PROJECT_SPECIFICATION.md)**

---

## Native Windows Quickstart (Zero-Docker Full Stack)

INKVECTOR includes portable native Windows Redis binaries and zero-friction batch scripts so you can launch the entire stack on Windows without Docker or WSL:

### Option A: One-Click Launch (All 4 Services)
Double-click [`start_all.bat`](start_all.bat) or run from PowerShell:
```cmd
.\start_all.bat
```
*This concurrently starts Redis (port 6379), Celery Worker (`solo` pool), FastAPI Backend (port 8000), and React 19 Frontend (port 3000) in dedicated windows.*

---

### Option B: Component-by-Component Launch

1. **Start Native Windows Redis:**
   ```cmd
   .\start_redis.bat
   ```
   *(Runs `tools\redis\redis-server.exe tools\redis\redis.windows.conf` on `127.0.0.1:6379`)*

2. **Start Celery Background Worker:**
   ```cmd
   .\start_celery.bat
   ```
   *(Executes `python -m celery -A src.backend.workers.celery_app worker -P solo -l info`)*

3. **Start FastAPI Backend:**
   ```cmd
   .\start_backend.bat
   ```
   *(Or: `python -m uvicorn src.backend.main:app --host 127.0.0.1 --port 8000 --reload`)*

4. **Start Vite React Frontend:**
   ```cmd
   .\start_frontend.bat
   ```
   *(Or: `cd src/frontend && npm run dev`)*

---

## Web Application Access
- **Web Dashboard:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **FastAPI OpenAPI Schema:** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## Automated Acceptance Test Suite (Tests A–H)

Run the full acceptance verification suite covering global discovery, AI comparison, buy/sell scenarios, sentiment, and background processing:
```cmd
pytest tests/test_global_stock_and_scenarios.py -v
```
```
============================= 8 passed in 32.89s =============================
- Test A: Global Stock Discovery (US, UK, Japan, Switzerland) PASSED
- Test B: Multi-Provider Price Retrieval & Provenance PASSED
- Test C: AI Stock Comparison Matrix (NVIDIA vs AMD) PASSED
- Test D: Buy/Sell Scenario Simulation with HHI Delta PASSED
- Test E: Multi-Source Sentiment Analysis (-1.0 to +1.0) PASSED
- Test F: Celery and Redis Native Windows Task Processing PASSED
- Test G: Chat Response Reliability (Non-Empty / Zero-Hallucination) PASSED
- Test H: Portfolio Multi-Currency & Concentration Normalization PASSED
```

---

## License & Compliance
This software is developed strictly for research, quantitative analysis, and educational purposes. All data providers operate under their respective licensing terms and fair-access limits.
