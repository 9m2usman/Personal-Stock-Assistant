# AI Stock Market Assistant

An intelligent, institutional-grade financial research, quantitative stock analysis, and portfolio intelligence platform. Powered by FastAPI, PostgreSQL, Redis, Celery, and a modern React 19 / TypeScript frontend with a dual-engine charting architecture (TradingView Lightweight Charts for high-performance canvas price action + Recharts for portfolio analytics).

---

## Architecture Overview

```
                                 +-----------------------------+
                                 |  React 19 / TypeScript SPA  |
                                 +--------------+--------------+
                                                |
                               +----------------+----------------+
                               |    FastAPI Backend Service     |
                               +----------------+----------------+
                                                |
               +--------------------------------+--------------------------------+
               |                                |                                |
    +----------v----------+          +----------v----------+          +----------v----------+
    | PostgreSQL Database |          | Redis Broker & Cache|          |   Isolated Python   |
    | (Relational Store)  |          | (Celery Task Queue) |          |  Analytical Sandbox |
    +---------------------+          +----------+----------+          +---------------------+
                                                |
                                     +----------v----------+
                                     |    Celery Worker    |
                                     | (Async Batch Jobs)  |
                                     +---------------------+
```

---

## Core Capabilities

- **Multi-Provider Market Data Ingestion:** Automated routing across Twelve Data (US equities), Alpha Vantage (UK / LSE equities), and American Depositary Receipts (ADRs).
- **Deterministic Python Analytics:** Technical analysis (SMA, EMA, RSI, MACD, Bollinger Bands, ATR) calculated deterministically inside an isolated sandbox.
- **Audited Financial Fundamentals:** Multi-period balance sheets, income statements, and cash flows with GAAP/IFRS XBRL fact preservation via SEC EDGAR and Financial Modeling Prep `/stable/`.
- **Excel Portfolio Integration:** Drag-and-drop spreadsheet upload with flexible column mapping, spot FX conversion, and asset concentration diagnostics.
- **Strict Non-Execution Brokerage Boundary:** A pure research and decision-support platform—zero brokerage execution tokens, zero trade placements.

---

## Documentation

- [Master Project Specification](docs/PROJECT_SPECIFICATION.md): Comprehensive 30-section technical and architectural specification.
- [API Provider Validation Report](research/provider-validation/API_PROVIDER_VALIDATION_REPORT.md): Audited empirical findings across all candidate market data APIs.
- [Data Ingestion Architecture](research/provider-validation/DATA_INGESTION_ARCHITECTURE.md): Multi-provider adapter design pattern and caching topology.
- [Provider Comparison Matrix](research/provider-validation/PROVIDER_COMPARISON.md): 14-dimension comparative analysis.

---

## Local Development Quickstart

### 1. Prerequisites
- Python 3.12+ (Python 3.14 compatible)
- Docker Desktop (for PostgreSQL 16 and Redis 7 backing services)
- Node.js 20+ (for frontend development)

### 2. Environment Configuration
Copy the template configuration file:
```bash
cp .env.example .env
```
Ensure your `.env` contains valid credentials for external providers (never commit this file).

### 3. Launch Local Backing Services
```bash
docker compose up -d
```
This spins up:
- **PostgreSQL 16** on `localhost:5432` (database: `fintech_market_assistant`)
- **Redis 7** on `localhost:6379`

### 4. Install Python Dependencies
```bash
pip install -e .
```

### 5. Run Backend Development Server
```bash
uvicorn src.backend.main:app --reload --port 8000
```
API Documentation will be available at: `http://localhost:8000/docs`

---

## License & Compliance
This project is developed for institutional research and educational purposes. All external data providers operate under their respective licensing terms and fair-access policies.
