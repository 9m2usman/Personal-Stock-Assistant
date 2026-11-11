# Provider Comparison Matrix (Audited & Reconciled)

**Project:** AI Stock Market Assistant  
**Date of Audit:** 2026-11-11  
**Scope:** Comparative analysis of candidate API providers across 14 operational, technical, and legal dimensions.

---

## 1. Comprehensive Feature & Capability Matrix

| Evaluation Dimension | Alpha Vantage | Twelve Data | Financial Modeling Prep (FMP) | NewsAPI | Nasdaq Data Link | SEC EDGAR |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **U.S. Stock Coverage** | **Confirmed** (`NVDA` confirmed, 100 observations) | **Confirmed** (`NVDA` confirmed) | **Confirmed** (`NVDA` on `/stable/`) | N/A (Articles only) | **Not Supported** (Free `WIKI` ended 2018) | **No Price Data** (Regulatory filers only) |
| **UK Stock Coverage (LSE)** | **Confirmed** (`HSBA.LON` in GBp, 100 observations) | **Not accessible on free** (Requires Grow $79/mo or Venture $499/mo) | **Not accessible on free** (US ADR works; direct `.L` is 402 Special Endpoint) | N/A | **Not Supported** on free tier | **Partial** (Registered Foreign Issuers 20-F only) |
| **Japanese Stock Coverage (TSE/JPX)** | **Not supported on free tier** | **Unresolved / Unsupported** (`7203` returned `Data not found`) | **Not accessible on free** (US ADR `TM` works; direct `7203.T` is 402) | N/A | **Not Supported** on free tier | **Partial** (Registered Foreign Issuers: Toyota `TM` 20-F) |
| **Swiss Stock Coverage (SIX)** | **Not supported on free tier** | **Not accessible on free** (Requires Pro $229/mo or Venture $499/mo) | **Not accessible on free** (Direct `NESN.SW` is 402 Special Endpoint) | N/A | **Not Supported** on free tier | **Not Supported** (Unregistered / Rule 12g3-2(b) exempt) |
| **Global Market Breadth** | Moderate (US, UK, selective EU) | High (100,000+ symbols, but foreign markets paywalled) | Moderate on free tier (US primary + US ADRs) | High (Articles from 80,000+ news publishers) | Global Macro / Institutional Datasets | US Capital Markets & Registered Foreign Filers |
| **Historical Price Depth** | **100 Days (~5 mos)** on free (`compact`); 20+ yrs is premium | Multi-year for US; foreign markets paywalled | 5+ years for US on `/stable/historical-price-eod/full` | 1 Month past news on Developer tier | Frozen in 2018 for free `WIKI` equities | **None** (Provides zero stock quote / price feeds) |
| **Real-time / Delay Tier** | EOD / 15-min delay on free tier | Real-time US on free tier; EOD history | 15-min delayed quote on free tier | 24-Hour delay on Developer tier | Static / Tabular Macro datasets | Near real-time filings (<5 min post-acceptance) |
| **Financial Fundamentals** | Very basic (Overview/Earnings limited on free tier) | Limited on free tier (Paid add-ons) | **Superior** (Full 3-statement financial statements on `/stable/`) | None | Macro indicators only (FRED, etc.) | **Authoritative Gold Standard** (600+ GAAP/IFRS XBRL tags) |
| **News Capabilities** | Basic sentiment endpoint | None | News endpoint exists, but restricted on free | **Superior** (Rich multi-publisher keyword search) | None | Material disclosure 8-K / 6-K filings |
| **FX / Currency Capabilities** | Strong (`CURRENCY_EXCHANGE_RATE`) | Strong (`/exchange_rate`, `/currency_conversion`) | Basic on free tier | None | Limited FX datasets | None |
| **Free-Plan Limits** | **25 req/day**, 5 req/min | **800 req/day**, 8 credits/min | **250 req/day**, 300 req/min | **100 req/day**, localhost only | Blocked by client WAF screening | **10 req/second** (Fair access rule) |
| **Internal Development Rights** | Permitted | Permitted | Permitted | Permitted (localhost only) | Permitted | **Completely Unrestricted** |
| **Public / Commercial Usage Rights** | Commercial license required | Commercial license required (Venture $499/mo) | Commercial license required | Prohibited on Developer tier (Business $449/mo req.) | Commercial database subscriptions required | **Public Domain** (Completely Free & Legal) |
| **Ease of Integration** | **Moderate** (Plain JSON, but strict 25 req/day cap) | **High** (Standard REST & MIC code mapping) | **High** (Standard REST JSON on `/stable/`) | **High** (Standard REST JSON) | **Low** (WAF screening, tabular catalog codes) | **Moderate** (Requires XBRL parser or JSON extractor) |

---

## 2. In-Depth Operational Breakdown

### A. Price Feeds & Market Data
- **Alpha Vantage** offers a working bridge for US (`NVDA`) and UK (`HSBA.LON`) prices, but its free tier is strictly limited to `outputsize=compact` (**100 trading days**) and a **25 request/day** quota ceiling. Multi-decade full history is premium-only.
- **Twelve Data** provides the cleanest API design and exchange timezone metadata for US equities on its free tier (800 req/day). However, non-US exchanges are actively paywalled:
  - LSE (UK) requires the **Grow Plan ($79/mo)** or **Venture Plan ($499/mo)**.
  - SIX (Swiss) requires the **Pro Plan ($229/mo)** or **Venture Plan ($499/mo)**.
  - JPX (Japan) returned `"Data not found"` on the basic endpoint.
- **FMP** under `/stable/historical-price-eod/full` delivers reliable US daily OHLCV, but direct non-US listings return HTTP 402 ("Special Endpoint").

### B. Fundamental Data & Financial Statements
- **SEC EDGAR** is the premier, zero-cost, legal source for US filers and foreign ADRs filing 20-F/6-K. It provides 600+ GAAP/IFRS XBRL accounting tags. It covers US domestic filers and registered foreign private issuers; unregistered foreign companies (e.g. Nestlé SA) do not file annual 20-F reports on EDGAR. **SEC EDGAR provides zero market price data.**
- **FMP `/stable/`** provides the cleanest developer experience for consuming pre-parsed JSON financial statements (Balance Sheet, Income Statement, Cash Flow) for US equities, though foreign primary listings are paywalled.

### C. News Feeds
- **NewsAPI** provides broad, relevant, multi-publisher global financial news coverage. However, its Developer tier is strictly limited to local prototyping (localhost only, 24h delay, 1-month archive, 100 req/day). It cannot be used in a deployed production web application without a paid Business license ($449/mo).

### D. Macro & Alternative Data
- **Nasdaq Data Link** is an asynchronous tabular repository for econometric and quantitative research, not an operational stock quote API. The legacy free `WIKI` stock dataset was frozen in March 2018; modern equity databases (Sharadar) require paid subscriptions. Free macroeconomic feeds (FRED) exist in the catalog, but automated client requests encountered Imperva/Incapsula WAF challenge screening.
