# Test Execution Summary (Audited & Reconciled)

**Project:** AI Stock Market Assistant  
**Date of Audit:** 2026-11-11  
**Execution Environment:** Windows Standard Environment / Python 3.14  
**Audit Purpose:** Reconcile execution telemetry, correct provider plan specifications, disaggregate HTTP response bodies, and classify evidence levels.  

---

## 1. Execution Telemetry & Reconciled Request Accounting

- **Total Test Cases Executed & Recorded:** **57 discrete tests**
- **Phase Breakdown:**
  - **Phase 1: Baseline Verification Suite:** **47 tests** (Automated script execution evaluating all configured provider endpoints)
  - **Phase 2: Diagnostic & Architectural Verification Suite:** **10 tests** (Targeted architectural probes for FMP `/stable/`, Twelve Data response body analysis, and WAF diagnostic verification)
- **Provider Breakdown (57 Total):**
  - **Financial Modeling Prep (FMP):** **23 tests** (15 Phase 1 legacy tests + 8 Phase 2 stable architecture tests)
  - **Alpha Vantage:** **10 tests** (4 symbol searches + 6 daily OHLCV queries)
  - **Twelve Data:** **9 tests** (4 symbol searches + 4 daily OHLCV queries + 1 diagnostic response body audit)
  - **Nasdaq Data Link:** **5 tests** (4 Phase 1 dataset queries + 1 diagnostic WAF audit)
  - **NewsAPI:** **5 tests** (5 topic searches)
  - **SEC EDGAR:** **5 tests** (1 ticker index + 3 submission queries + 1 XBRL facts query)
- **Credential Security:** 100% sanitized. Zero API keys were written to logs, artifacts, reports, or terminal outputs.

---

## 2. Comprehensive Itemized Test Ledger (T01 – T57)

Every test record in [`provider_test_results.json`](file:///E:/finTech-inkVector/research/provider-validation/provider_test_results.json) maps 1:1 to the following itemized ledger:

### Phase 1: Baseline Verification (47 Tests)

| Test ID | Provider | Target Endpoint / Action | Symbol / Query | HTTP Code | Status Classification | Evidence Category |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T01** | Alpha Vantage | `SYMBOL_SEARCH` | NVIDIA | 200 | SUCCESS | Confirmed by API test |
| **T02** | Alpha Vantage | `SYMBOL_SEARCH` | HSBC Holdings | 200 | SUCCESS | Confirmed by API test |
| **T03** | Alpha Vantage | `SYMBOL_SEARCH` | Toyota Motor | 200 | SUCCESS | Confirmed by API test |
| **T04** | Alpha Vantage | `SYMBOL_SEARCH` | Nestlé SA | 200 | SUCCESS | Confirmed by API test |
| **T05** | Alpha Vantage | `TIME_SERIES_DAILY` | `NVDA` (NASDAQ) | 200 | SUCCESS (Compact 100 Days) | Confirmed by API test |
| **T06** | Alpha Vantage | `TIME_SERIES_DAILY` | `HSBA.LON` (LSE) | 200 | SUCCESS (Compact 100 Days) | Confirmed by API test |
| **T07** | Alpha Vantage | `TIME_SERIES_DAILY` | `7203.TKS` (Tokyo) | 200 | UNSUPPORTED_SYMBOL | Not supported on free tier |
| **T08** | Alpha Vantage | `TIME_SERIES_DAILY` | `NESN.SWI` (SIX) | 200 | UNSUPPORTED_SYMBOL | Not supported on free tier |
| **T09** | Alpha Vantage | `TIME_SERIES_DAILY` | `7203.TYO` (Tokyo Alt) | 200 | UNSUPPORTED_SYMBOL | Not supported on free tier |
| **T10** | Alpha Vantage | `TIME_SERIES_DAILY` | `NESN.SW` (SIX Alt) | 200 | RATE_LIMITED (25/day cap) | Confirmed by API test |
| **T11** | Twelve Data | `symbol_search` | `NVDA` | 200 | SUCCESS | Confirmed by API test |
| **T12** | Twelve Data | `symbol_search` | `HSBA` | 200 | SUCCESS | Confirmed by API test |
| **T13** | Twelve Data | `symbol_search` | `7203` | 200 | SUCCESS | Confirmed by API test |
| **T14** | Twelve Data | `symbol_search` | `NESN` | 200 | SUCCESS | Confirmed by API test |
| **T15** | Twelve Data | `time_series` (Daily) | `NVDA` on NASDAQ | 200 | SUCCESS | Confirmed by API test |
| **T16** | Twelve Data | `time_series` (Daily) | `HSBA` on LSE | 404 | TIER_RESTRICTED (Grow/Venture) | Not accessible under free plan |
| **T17** | Twelve Data | `time_series` (Daily) | `7203` on TSE | 404 | DATA_NOT_FOUND | Unresolved / Unsupported |
| **T18** | Twelve Data | `time_series` (Daily) | `NESN` on SWX | 404 | TIER_RESTRICTED (Pro/Venture) | Not accessible under free plan |
| **T19** | FMP | `/api/v3/search` | NVIDIA | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T20** | FMP | `/api/v3/profile` | `NVDA` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T21** | FMP | `/api/v3/profile` | `HSBC` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T22** | FMP | `/api/v3/profile` | `HSBA.L` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T23** | FMP | `/api/v3/profile` | `TM` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T24** | FMP | `/api/v3/profile` | `7203.T` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T25** | FMP | `/api/v3/profile` | `NESN.SW` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T26** | FMP | `/api/v3/income-statement` | `NVDA` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T27** | FMP | `/api/v3/balance-sheet-statement` | `NVDA` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T28** | FMP | `/api/v3/cash-flow-statement` | `NVDA` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T29** | FMP | `/api/v3/income-statement` | `HSBC` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T30** | FMP | `/api/v3/income-statement` | `HSBA.L` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T31** | FMP | `/api/v3/historical-price-full` | `NVDA` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T32** | FMP | `/api/v3/historical-price-full` | `HSBC` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T33** | FMP | `/api/v3/historical-price-full` | `7203.T` | 403 | LEGACY_DEPRECATED | Confirmed by API test |
| **T34** | NewsAPI | `/v2/everything` | NVIDIA | 200 | SUCCESS | Confirmed by API test |
| **T35** | NewsAPI | `/v2/everything` | HSBC | 200 | SUCCESS | Confirmed by API test |
| **T36** | NewsAPI | `/v2/everything` | Toyota | 200 | SUCCESS | Confirmed by API test |
| **T37** | NewsAPI | `/v2/everything` | Nestlé | 200 | SUCCESS | Confirmed by API test |
| **T38** | NewsAPI | `/v2/everything` | Global Markets | 200 | SUCCESS | Confirmed by API test |
| **T39** | Nasdaq Data Link | `datasets.json` (Search) | stock prices | 403 | WAF_BLOCKED | Client WAF screening |
| **T40** | Nasdaq Data Link | `datasets/FRED/GDP.json` | FRED/GDP | 403 | WAF_BLOCKED | Client WAF screening |
| **T41** | Nasdaq Data Link | `datasets/WIKI/NVDA.json` | WIKI/NVDA | 403 | WAF_BLOCKED (WIKI frozen 2018)| Frozen legacy dataset |
| **T42** | Nasdaq Data Link | `datatables/SHARADAR/SEP` | NVDA | 200/403 | PREMIUM_LOCKED | Commercial subscription req. |
| **T43** | SEC EDGAR | `company_tickers.json` | Directory Lookup | 200 | SUCCESS (10,414 tickers) | Confirmed by API test |
| **T44** | SEC EDGAR | `submissions/CIK...` | NVIDIA (CIK 0001045810) | 200 | SUCCESS (10-K, 10-Q) | Confirmed by API test |
| **T45** | SEC EDGAR | `submissions/CIK...` | HSBC (CIK 0001140465) | 200 | SUCCESS (20-F, 6-K) | Confirmed by API test |
| **T46** | SEC EDGAR | `submissions/CIK...` | Toyota (CIK 0001094517) | 200 | SUCCESS (20-F, 6-K) | Confirmed by API test |
| **T47** | SEC EDGAR | `companyfacts/CIK...` | NVIDIA (CIK 0001045810) | 200 | SUCCESS (627 GAAP facts) | Confirmed by API test |

---

### Phase 2: Diagnostic & Architectural Verification Suite (10 Tests)

| Test ID | Provider | Target Endpoint / Action | Symbol / Query | HTTP Code | Status Classification | Evidence Category |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T48** | FMP | `/stable/search-name` | NVIDIA | 200 | SUCCESS | Confirmed by API test |
| **T49** | FMP | `/stable/profile` | `NVDA` | 200 | SUCCESS | Confirmed by API test |
| **T50** | FMP | `/stable/profile` | US ADRs (`HSBC`, `TM`) | 200 | SUCCESS | Confirmed by API test |
| **T51** | FMP | `/stable/profile` | Direct Foreign (`.L`, `.T`, `.SW`) | 402 | TIER_RESTRICTED (Special Endpoint) | Not accessible under free plan |
| **T52** | FMP | `/stable/income-statement` | `NVDA` | 200 | SUCCESS (FY 2026 audited) | Confirmed by API test |
| **T53** | FMP | `/stable/balance-sheet-statement`| `NVDA` | 200 | SUCCESS (3 periods) | Confirmed by API test |
| **T54** | FMP | `/stable/cash-flow-statement` | `NVDA` | 200 | SUCCESS (3 periods) | Confirmed by API test |
| **T55** | FMP | `/stable/historical-price-eod/full`| `NVDA` | 200 | SUCCESS | Confirmed by API test |
| **T56** | Twelve Data | Response Body Diagnostic | `HSBA`, `7203`, `NESN` | 404 | AUDIT_COMPLETED | Confirmed by API test & docs |
| **T57** | Nasdaq Data Link | WAF Defense Diagnostic | Client Request Audit | 403 | WAF_CHALLENGE_DIAGNOSED | Confirmed by API test & docs |

---

## 3. Detailed Technical Audit Findings & Adjustments

### A. Alpha Vantage: Historical Daily Depth Correction
- **Previous Claim:** "Historical Price Depth: 20+ years for US (`full` outputsize)".
- **Audit Correction:** Inaccurate for the free tier. On Alpha Vantage's free plan, `TIME_SERIES_DAILY` is strictly limited to `outputsize=compact`, which returns only the **latest 100 trading days (~5 months)** of data. The `outputsize=full` parameter (which provides 20+ years of daily history) requires an active paid premium subscription.
- **Evidence Level:** Confirmed by official documentation and test output.

### B. Twelve Data: Current Plan Names, Pricing & 404 Error Disaggregation
- **Previous Claim:** Listed outdated Grow ($29/mo) and Pro ($79/mo) pricing; classified all 404 responses as paid-tier restrictions.
- **Audit Correction:**
  1. **Official Current Pricing:**
     - **Basic Plan:** Free ($0/mo) — 8 API credits/min, 800 credits/day, real-time US equities, personal development only.
     - **Grow Plan:** **$79/month** — up to 377 credits/min, covers 20+ markets (including LSE end-of-day).
     - **Pro Plan:** **$229/month** — up to 1,597 credits/min, covers 70+ markets (including SIX Swiss).
     - **Ultra Plan:** **$999/month** — 10,946 credits/min, 80+ markets.
     - **Commercial / Business Tiers:** **Venture Plan** ($499/mo), **Enterprise Plan** ($1,099/mo).
  2. **Disaggregation of 404 Response Bodies:**
     - `HSBA` on `LSE`: **Confirmed Plan Restriction.** Response explicitly stated: `{"code":404,"message":"This symbol is available starting with the Grow or Venture plan. Consider upgrading now at https://twelvedata.com/pricing","status":"error"}`.
     - `NESN` on `SIX`: **Confirmed Plan Restriction.** Response explicitly stated: `{"code":404,"message":"This symbol is available starting with the Pro or Venture plan. Consider upgrading now at https://twelvedata.com/pricing","status":"error"}`.
     - `7203` on `JPX` / `TSE`: **Data Not Found / Unresolved.** Response stated: `{"code":404,"message":"Data not found","status":"error","meta":{"symbol":"7203","interval":"1day","exchange":"JPX"}}`. This is an instrument/exchange data omission or missing symbol mapping on the basic endpoint, **NOT** an explicit plan restriction upgrade prompt.

### C. SEC EDGAR: Filing Scope, Entity Eligibility & Price Data Boundary
- **Scope of Coverage:** SEC EDGAR is **not** a universal global company database. It covers:
  1. US domestic public companies (Forms 10-K, 10-Q, 8-K).
  2. Registered Foreign Private Issuers (FPIs) with US-listed securities (Forms 20-F, 6-K), such as HSBC Holdings plc and Toyota Motor Corporation.
  3. Foreign entities without US public registrations or trading strictly under Rule 12g3-2(b) exempt status (such as Nestlé SA, which trades OTC as `NSRGY` / `NSRGF`) **do not file annual financial reports on EDGAR**.
- **Nature of Data:** SEC EDGAR provides **strictly regulatory disclosures and standardized XBRL financial accounting facts**. It provides **zero market price data** (no OHLCV, ticks, bid/ask spreads, or volume series).
- **Fair Access Policy:** Mandatory declared User-Agent (`Company Contact@domain.com`) and a strict ceiling of **no more than 10 requests per second**.

### D. Nasdaq Data Link: Reassessment & WAF Characterization
- **Legacy WIKI Dataset:** Confirmed frozen in March 2018. Disqualified for live or modern equity prices.
- **Active Datasets:** Modern equity databases (e.g. Sharadar `SEP`, Zacks) are active and maintained, but require **commercial paid database subscriptions**. Free macroeconomic datasets (e.g. Federal Reserve FRED data) are officially supported on the platform.
- **WAF screening:** Automated requests from the test environment triggered Imperva / Incapsula Web Application Firewall challenges (HTTP 403). This represents a client environment / anti-bot screening barrier rather than a total shutdown of the Nasdaq Data Link platform.
- **Role:** Asynchronous tabular research warehouse, not an operational real-time quote API for an interactive market assistant.

---

## 4. Evidence Classification Taxonomy

| Provider | Capability | Evidence Classification | Status & Notes |
| :--- | :--- | :--- | :--- |
| **Alpha Vantage** | US Daily OHLCV (`NVDA`) | **Confirmed by API test** | Succeeded (HTTP 200). Returns latest 100 observations (compact). |
| **Alpha Vantage** | UK Daily OHLCV (`HSBA.LON`) | **Confirmed by API test** | Succeeded (HTTP 200). Returns latest 100 observations in GBp. |
| **Alpha Vantage** | 20+ Year Full History | **Not accessible under free plan** | `outputsize=full` requires paid premium tier. |
| **Alpha Vantage** | Tokyo / Swiss Direct Listings | **Not supported on free tier** | Returned invalid call errors; symbol format not supported on basic tier. |
| **Twelve Data** | US Daily OHLCV (`NVDA`) | **Confirmed by API test** | Succeeded (HTTP 200). Full OHLCV metadata returned. |
| **Twelve Data** | UK Daily OHLCV (`HSBA`) | **Not accessible under free plan** | Explicit 404 message: requires Grow ($79/mo) or Venture ($499/mo). |
| **Twelve Data** | Swiss Daily OHLCV (`NESN`)| **Not accessible under free plan** | Explicit 404 message: requires Pro ($229/mo) or Venture ($499/mo). |
| **Twelve Data** | Tokyo Daily OHLCV (`7203`) | **Unresolved / Unsupported** | Returned `Data not found`; symbol/exchange not available on basic endpoint. |
| **FMP** | Legacy `/api/v3/` Routes | **Not supported for new keys** | Deprecated for keys generated post-Aug 31, 2025 (HTTP 403). |
| **FMP** | Stable US Equities & Statements | **Confirmed by API test** | Succeeded on `/stable/` (HTTP 200) for profile, 3-statement financials, EOD price. |
| **FMP** | Direct Non-US Listings (`.L`, `.T`, `.SW`) | **Not accessible under free plan** | HTTP 402 "Special Endpoint" requiring paid plan. |
| **NewsAPI** | Multi-Topic Keyword News | **Confirmed by API test** | Succeeded (HTTP 200) across all 5 queries. |
| **NewsAPI** | Production / Commercial Use | **Not accessible under free plan** | Prohibited by Developer terms (localhost only, 24h delay, 100 req/day). |
| **Nasdaq Data Link**| Free Live Equities | **Not supported** | Free `WIKI` stock dataset frozen March 2018. |
| **Nasdaq Data Link**| Macro / Economic Data (FRED) | **Supported by docs / Blocked by WAF**| Available in catalog; blocked by Incapsula WAF challenge on automated client. |
| **Nasdaq Data Link**| Modern Equities (Sharadar) | **Not accessible under free plan** | Requires commercial paid database subscription. |
| **SEC EDGAR** | US Filer Filings & XBRL Facts | **Confirmed by API test** | Succeeded (HTTP 200) with 627 standardized GAAP concepts for `NVDA`. |
| **SEC EDGAR** | Foreign Private Issuers (20-F) | **Confirmed by API test** | Succeeded (HTTP 200) for registered ADRs (`HSBC`, `TM`). |
| **SEC EDGAR** | Unregistered Foreign Issuers | **Not supported by SEC mandate** | Entities without US public registration (e.g. Nestlé SA) do not file 20-F. |
| **SEC EDGAR** | Market Price Data | **Not supported by SEC API** | SEC EDGAR does not provide stock quotes, ticks, or OHLCV feeds. |
