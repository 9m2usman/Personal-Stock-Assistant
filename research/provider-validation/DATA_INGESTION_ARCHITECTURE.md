# Multi-Provider Data Ingestion Architecture & Routing Blueprint

**Project:** AI Stock Market Assistant  
**Date:** 2026-11-11  
**Status:** Approved Architectural Blueprint (Derived from Empirical Validation)  
**Author:** Senior Backend & Financial Integration Engineer  

---

## 1. Architectural Overview & Design Patterns

Based on the empirical findings documented in [`API_PROVIDER_VALIDATION_REPORT.md`](file:///E:/finTech-inkVector/research/provider-validation/API_PROVIDER_VALIDATION_REPORT.md), no single free API can service all required asset classes and data types. A unified **Multi-Provider Adapter & Routing Architecture** is required.

```
                                  +-----------------------------+
                                  |   AI Assistant Core Engine   |
                                  +--------------+--------------+
                                                 |
                               +-----------------+-----------------+
                               |  Unified Financial Data Service   |
                               +-----------------+-----------------+
                                                 |
           +-------------------------------------+-------------------------------------+
           |                                     |                                     |
+----------v-----------+             +-----------v------------+             +----------v----------+
|  Market Data Router  |             |  Fundamentals Router   |             |     News Router     |
+----+--------+----+---+             +-----+------------+-----+             +----------+----------+
     |        |    |                       |            |                              |
     |        |    +-------------+         |            |                              |
+----v---+ +-v-------+ +---------v-----+ +-v--------+ +-v-----------+               +--v---------+
| Twelve | |  Alpha  | | FMP /stable/  | | SEC EDGAR| | FMP /stable/|               |  NewsAPI   |
|  Data  | | Vantage | | (Fallback EOD)| |  (XBRL)  | | (Statements)|               | (Local Dev)|
|  (US)  | |  (LSE)  | |               | | (Primary)| | (Fast JSON) |               +------------+
+--------+ +---------+ +---------------+ +----------+ +-------------+
```

---

## 2. Dynamic Routing Matrix by Instrument & Asset Class

| Instrument / Asset | Primary Provider | Fallback Provider | Data Format | Currency | Handling Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **US Equities** (e.g. `NVDA`) | **Twelve Data** | **FMP `/stable/`** | Daily OHLCV & Intraday | USD | Direct API call with Redis / local cache TTL = 300s during trading hours. |
| **UK Equities** (e.g. `HSBA.LON`) | **Alpha Vantage** | ADR `HSBC` via Twelve Data | Daily OHLCV | GBp (pence) | Cache aggressively (TTL = 24h) to conserve Alpha Vantage's 25 req/day cap. |
| **Japanese Equities** (e.g. Toyota) | **ADR `TM` (Twelve Data / FMP)** | Twelve Data `7203:JPX` *(Paid)* | Daily OHLCV | USD *(Free)* / JPY *(Paid)* | **Dual-Mode Adapter:** Free mode uses NYSE ADR `TM`; paid upgrade switches to native Tokyo `7203`. |
| **Swiss Equities** (e.g. Nestlé) | **ADR `NSRGY` (Twelve Data / FMP)** | Twelve Data `NESN:SIX` *(Paid)* | Daily OHLCV | USD *(Free)* / CHF *(Paid)* | **Dual-Mode Adapter:** Free mode uses US OTC `NSRGY`; paid upgrade switches to Zurich `NESN`. |
| **US Financial Statements** | **FMP `/stable/`** | **SEC EDGAR XBRL** | Normalized JSON (Balance, Income, Cash) | USD | High-speed JSON parsing from FMP `/stable/` with fallback to native SEC EDGAR facts. |
| **Foreign Regulatory Filings** | **SEC EDGAR** | FMP US ADR Profile | Official 20-F / 6-K Filings | Multi-currency (IFRS/GAAP) | Authoritative annual 20-F and material 6-K filings for international issuers. |
| **Market News & Sentiments** | **NewsAPI** | Open Financial RSS Feeds | JSON (Title, Source, URL, Timestamp) | Multi-language | Localhost development pipeline; decoupled interface ready for production swap. |

---

## 3. Rate Limiting, Pacing & Caching Tier

To prevent provider throttling and 429/403 lockouts, the data ingestion layer enforces strict token bucket rate limiters:

1. **Alpha Vantage Limiter:**
   - Token capacity: 5 tokens/minute.
   - Daily quota tracker: Max 25 tokens/day.
   - Cache policy: EOD prices cached on disk/SQLite with 24-hour expiration.
2. **Twelve Data Limiter:**
   - Token capacity: 8 tokens/minute.
   - Daily quota tracker: Max 800 tokens/day.
   - Cache policy: Real-time quotes cached for 60 seconds; daily OHLCV cached for 12 hours.
3. **FMP `/stable/` Limiter:**
   - Token capacity: 300 tokens/minute.
   - Daily quota tracker: Max 250 tokens/day on free tier.
   - Cache policy: Financial statements cached for 30 days (updated post-earnings only).
4. **SEC EDGAR Fair Access Regulator:**
   - Strict rate ceiling: <= 10 requests/second.
   - Mandatory header: User-Agent in standard format (`InkVectorFintech Research/1.0 contact@inkvector.com`).
   - Caching: Ticker-to-CIK index cached for 7 days; Company Facts XBRL cached for 14 days.

---

## 4. Suggested Project Layout for Data Layer Scaffolding

When ready to implement, the backend data tier will be structured cleanly without polluting the root:

```
finTech-inkVector/
├── .env                          # Local credentials (git-ignored)
├── .env.example                  # Template with placeholders
├── .gitignore                    # Security exclusions
├── research/
│   └── provider-validation/      # Audit reports, test JSON, and comparison docs
└── src/
    └── core/
        └── data_ingestion/
            ├── __init__.py
            ├── base.py           # Abstract Base Classes (MarketDataProvider, FundamentalsProvider, NewsProvider)
            ├── rate_limiter.py   # Token bucket & daily budget tracking
            ├── cache.py          # Unified caching interface (In-Memory / SQLite / Redis)
            ├── providers/
            │   ├── __init__.py
            │   ├── twelve_data.py
            │   ├── alpha_vantage.py
            │   ├── fmp_stable.py
            │   ├── sec_edgar.py
            │   └── news_api.py
            └── router.py         # Unified FinancialDataRouter with fallback orchestration
```

---

## 5. Next Steps

With provider validation completed and this architecture blueprint documented:
1. **Phase 1 (Complete):** Provider Validation & Documentation.
2. **Phase 2 (Next):** Implement the foundational data ingestion abstractions (`src/core/data_ingestion/`) with mock & live test coverage.
3. **Phase 3:** Financial statement normalization & XBRL processing.
4. **Phase 4:** AI Assistant reasoning engine & prompt pipeline.
