# API Provider Evaluation Sign-Off & Phase 2 Implementation Roadmap

**Project:** AI Stock Market Assistant  
**Repository Working Directory:** `E:\finTech-inkVector`  
**Current Phase:** Phase 1 — Provider Research & Empirical Validation (COMPLETED)  
**Upcoming Phase:** Phase 2 — Core Financial Data Client Scaffolding (PENDING APPROVAL)  
**Author:** Senior Backend & Financial Integration Engineer  
**Date:** 2026-11-11  

---

## 1. Executive Sign-Off & Final Provider Status

All candidate providers have been subjected to empirical testing, error disaggregation, documentation audits, and licensing reviews. The final operational determination for each provider is as follows:

```
+---------------------------------------------------------------------------------------------------------------+
|                                      FINAL PROVIDER DISPOSITION MATRIX                                        |
+----------------------+--------------------+---------------------+---------------------------------------------+
| Provider             | Final Disposition  | Operational Role    | Primary Constraint / Boundary Condition     |
+----------------------+--------------------+---------------------+---------------------------------------------+
| Twelve Data          | APPROVED (Primary) | US Daily & Intraday | Free tier restricted to US (800 req/day).   |
| Financial Mod. Prep  | APPROVED (Primary) | Fundamentals & Fall.| Must use /stable/ routes (250 req/day).     |
| SEC EDGAR            | APPROVED (Primary) | Regulatory Filings  | Mandatory User-Agent; <= 10 req/sec limit.  |
| Alpha Vantage        | APPROVED (Fallback)| UK (LSE) Daily EOD  | Strict 25 req/day cap; compact (100 days).  |
| NewsAPI              | APPROVED (Dev Only)| Financial News Dev  | Localhost only; prohibited in production.   |
| Nasdaq Data Link     | REJECTED           | Ineligible for App  | Legacy WIKI frozen 2018; Incapsula WAF blk. |
+----------------------+--------------------+---------------------+---------------------------------------------+
```

---

## 2. Definitive Multi-Provider Routing Specification

To satisfy the application's global requirements without violating free-plan constraints or purchasing subscriptions, the data ingestion tier will adhere to this routing specification:

### A. Equity Market Data Routing
1. **United States Equities (e.g. `NVDA`):**
   - **Primary Engine:** Twelve Data (`interval=1day`, `outputsize=100`, exchange `NASDAQ`).
   - **Secondary Failover:** Financial Modeling Prep (`/stable/historical-price-eod/full?symbol=NVDA`).
   - **Caching Policy:** In-memory TTL = 60s for live quotes; SQLite/Disk TTL = 12 hours for closed daily bars.
2. **United Kingdom Equities (e.g. `HSBA.LON`):**
   - **Primary Engine:** Alpha Vantage (`function=TIME_SERIES_DAILY&symbol=HSBA.LON`).
   - **Data Depth:** 100 trading days (compact series) in GBp (pence).
   - **Caching Policy:** Aggressive SQLite cache (TTL = 24 hours) to preserve the 25 req/day ceiling.
3. **Japanese Equities (e.g. Toyota Motor Corporation):**
   - **Free Tier Policy:** Route to US-listed ADR **`TM`** (NYSE) via Twelve Data / FMP in USD.
   - **Direct Local Listing Policy:** Direct Tokyo (`7203:JPX`) is paywalled or unmapped on free endpoints; native JPY data requires a future paid subscription.
4. **Swiss Equities (e.g. Nestlé SA):**
   - **Free Tier Policy:** Route to US OTC ADR **`NSRGY`** via Twelve Data / FMP in USD.
   - **Direct Local Listing Policy:** Direct Zurich (`NESN:SIX`) requires Twelve Data Pro ($229/mo) or FMP paid tier.

### B. Corporate Fundamentals & Financial Statements
1. **Authoritative Regulatory Filings:**
   - **Engine:** SEC EDGAR REST API.
   - **Scope:** US domestic corporations (10-K, 10-Q, 8-K) and registered Foreign Private Issuers (20-F, 6-K).
   - **Accounting Concepts:** Automated extraction of 600+ US GAAP / IFRS XBRL tags.
   - **Constraint:** Zero price data; non-US companies without US registration (e.g. Nestlé SA) are out of scope.
2. **Normalized 3-Statement Financials:**
   - **Engine:** Financial Modeling Prep `/stable/` architecture.
   - **Endpoints:** `/stable/income-statement`, `/stable/balance-sheet-statement`, `/stable/cash-flow-statement`.
   - **Scope:** US domestic companies and US-listed ADR profiles.

### C. Financial News & Sentiment Ingestion
1. **Prototype Phase:**
   - **Engine:** NewsAPI (`/v2/everything?q={query}&sortBy=publishedAt`).
   - **Scope:** Local development and pipeline testing only (localhost).
2. **Production Transition Requirement:**
   - NewsAPI must be replaced before production deployment with an open financial RSS feed aggregator or an officially licensed commercial provider (e.g. Finnhub, Benzinga, or NewsAPI Business @ $449/mo).

---

## 3. Phase 2 Implementation Roadmap (Ready Upon Approval)

When development authorization is granted, Phase 2 will execute the following modular steps:

```
[Phase 2.1] Foundation & Core Abstractions
       │   ├── Implement Abstract Base Classes (src/core/data_ingestion/base.py)
       │   └── Implement Token-Bucket Rate Limiters & Cache Manager (rate_limiter.py, cache.py)
       ▼
[Phase 2.2] Dedicated Provider Adapters
       │   ├── Twelve Data Adapter (twelve_data.py)
       │   ├── Alpha Vantage Adapter (alpha_vantage.py)
       │   ├── FMP Stable Adapter (fmp_stable.py)
       │   ├── SEC EDGAR Client with Fair-Access User-Agent (sec_edgar.py)
       │   └── NewsAPI Adapter (news_api.py)
       ▼
[Phase 2.3] Unified Router & Resilience Engine
       │   ├── Unified FinancialDataRouter with dynamic symbol translation and fallback
       │   └── Unit test suite verifying rate limiting, caching, and failover
```

---

## 4. Formal Sign-Off Request

- [x] Provider credentials inspected and preserved in `.env`.
- [x] Security controls verified (`.gitignore`, `.env.example`, zero credentials in logs/artifacts).
- [x] 57 discrete tests audited and reconciled across all candidate endpoints.
- [x] Inaccurate pricing and historical depth claims corrected.
- [x] Multi-provider routing strategy documented in [`DATA_INGESTION_ARCHITECTURE.md`](file:///E:/finTech-inkVector/research/provider-validation/DATA_INGESTION_ARCHITECTURE.md).

*Awaiting your explicit review and approval of the validation reports and this sign-off roadmap before any application code, database scaffolding, or external services are initialized.*
