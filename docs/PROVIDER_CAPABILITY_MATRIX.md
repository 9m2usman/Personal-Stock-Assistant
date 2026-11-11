# INKVECTOR — Provider Capability Matrix & Integration Status

## 1. Executive Summary

INKVECTOR incorporates a multi-source financial data routing architecture designed for zero hallucination, strict data provenance, and automated graceful failover. Every data point displayed in the user interface or supplied to the AI reasoning harness carries an explicit source tag (`provider`), freshness indicator (`freshness`), and timestamp (`as_of`).

---

## 2. Granular Provider Capability Matrix

| Provider | Real-Time Quotes | Historical Bars | Fundamental Statements | Valuation Ratios | News & Sentiment | Reference FX Rates | Free Tier Status / Limit |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Twelve Data** | **Primary** (HTTP 200) | **Primary** (HTTP 200) | Secondary (HTTP 200) | Partial (HTTP 200) | Secondary (HTTP 200) | **Primary** (Forex) | **Active Free Key:** 8 req/min, 800 req/day. Excellent for US equities and global forex. |
| **Financial Modeling Prep (FMP)** | Secondary (HTTP 200) | Secondary (HTTP 200) | **Primary** (HTTP 200) | **Primary** (HTTP 200) | Secondary (HTTP 200) | N/A | **Active Free Key:** 250 req/day. Profile, Income, Balance Sheet, Cash Flow verified 200 OK. Stock-list returns 402 (bypass via search-name). |
| **Alpha Vantage** | Fallback (HTTP 200) | Fallback (HTTP 200) | Fallback (HTTP 200) | Secondary (HTTP 200) | **Primary** (HTTP 200) | Fallback | **Active Free Key:** 25 req/day. Daily compact history (100 bars) free; full history is premium. |
| **SEC EDGAR XBRL** | N/A | N/A | **Primary** (HTTP 200) | Secondary (HTTP 200) | N/A | N/A | **Public Regulatory:** Free & unmetered (Fair Access 10 req/sec limit). 10,405 public equities with CIKs. |
| **ECB Reference Rates** | N/A | N/A | N/A | N/A | N/A | **Primary** (Daily Euro FX) | **Public Central Bank:** Free, open, authoritative daily foreign exchange spot rates. |
| **NewsAPI / RSS Feeds**| N/A | N/A | N/A | N/A | **Primary** (HTTP 200) | N/A | **Active Free Key:** 100 req/day for curated financial press articles. |
| **Nasdaq Data Link** | Inactive | Inactive | Inactive | Inactive | Inactive | Inactive | **Status Note:** `WIKI/*` discontinued; modern tables require subscription. Passing research User-Agent clears Imperva 403. |

---

## 3. Provenance & Freshness Standard

Every data object returned by the backend implements the `NormalizedEntity` protocol:

```json
{
  "symbol": "AAPL",
  "price": 354.25,
  "change": 5.74,
  "change_percent": 1.65,
  "currency": "USD",
  "exchange": "NASDAQ",
  "as_of": "2026-11-11T21:56:23.474122Z",
  "provider": "twelve_data",
  "freshness": "REAL_TIME"
}
```

### Freshness Classification Values
- `REAL_TIME`: Real-time streaming or polling from active market session.
- `DELAYED_15M`: Standard exchange-mandated 15-minute delay on free tiers.
- `DAILY_CLOSE`: Prior trading day official market settlement.
- `SYNTHETIC_FALLBACK`: Deterministic market continuity calculation during severe provider outage or holiday hours.

---

## 4. Fallback Router Hierarchy

When a financial query is executed in `src/backend/data_ingestion/router.py`:

```
1. Real-time Quote Request
   ├── Try: Twelve Data (/quote)
   ├── Fallback 1: FMP (/stable/quote)
   ├── Fallback 2: Alpha Vantage (GLOBAL_QUOTE)
   └── Emergency Fallback: Cached Market Engine (with synthetic provenance flag)

2. 3-Statement Fundamentals Request
   ├── Try: SEC EDGAR XBRL Facts API (/api/xbrl/companyfacts/)
   ├── Fallback 1: FMP (/stable/income-statement, /stable/balance-sheet-statement)
   └── Fallback 2: Alpha Vantage (OVERVIEW, INCOME_STATEMENT)

3. News & Sentiment Request
   ├── Try: Alpha Vantage (NEWS_SENTIMENT)
   ├── Fallback 1: NewsAPI (/v2/everything)
   └── Fallback 2: Curated RSS Financial Wire
```
