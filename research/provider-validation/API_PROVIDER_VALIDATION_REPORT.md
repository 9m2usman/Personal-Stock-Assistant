# Candidate API Provider Validation Report (Audited & Reconciled)

**Project:** AI Stock Market Assistant  
**Date of Validation:** 2026-11-11  
**Date of Audit & Reconciliation:** 2026-11-11  
**Validation Engineer:** Senior Backend & Financial Integration Engineer  
**Status:** Provider Validation Completed & Formally Audited (Application Development Not Started)

---

## Executive Summary

To establish an authoritative architectural foundation for the upcoming AI Stock Market Assistant, six candidate financial and news API providers were subjected to standardized, empirical live integration tests, pricing audits, and licensing reviews:

1. **Alpha Vantage** (Freemium API Key)
2. **Twelve Data** (Freemium API Key)
3. **Financial Modeling Prep [FMP]** (Freemium API Key)
4. **NewsAPI** (Freemium API Key)
5. **Nasdaq Data Link** (Freemium API Key)
6. **SEC EDGAR** (Public US Government API; Fair Access Compliance)

Every request was logged, sanitized to prevent credential exposure, rate-controlled, and audited across data freshness, coverage breadth, currency resolution, plan limits, and legal/commercial display rights.

### Key Audited Findings & Reconciliations

- **Execution Telemetry (57 Reconciled Tests):**  
  The validation suite executed exactly **57 discrete tests**, comprising **47 baseline tests** in Phase 1 and **10 diagnostic & architectural tests** in Phase 2 across all 6 providers.
- **US Equity Daily OHLCV:**  
  Confirmed via live API tests on **Twelve Data** (`NVDA`), **Financial Modeling Prep** (`NVDA` on `/stable/historical-price-eod/full`), and **Alpha Vantage** (`NVDA`).
- **Alpha Vantage Free Historical Depth:**  
  On the free tier, Alpha Vantage `TIME_SERIES_DAILY` is strictly restricted to `outputsize=compact`, returning only the **latest 100 trading days (~5 months)** of historical data. Multi-decade history (`outputsize=full`) requires an active paid premium subscription.
- **UK (LSE) Daily OHLCV:**  
  **Alpha Vantage** is the only tested provider that returned live, local-currency (`GBp`) LSE daily prices (`HSBA.LON`) under a free plan (100 observations). On **Twelve Data**, LSE access returned HTTP 404 with an explicit requirement for the **Grow Plan ($79/mo)** or **Venture Plan ($499/mo)**. On **FMP**, direct `.L` listings return HTTP 402 ("Special Endpoint").
- **Japanese (TSE/JPX) & Swiss (SIX) Equities:**  
  **Not accessible under any tested free plan.**
  - *Twelve Data:* Swiss listing (`NESN` on SIX) returned HTTP 404 explicitly requiring the **Pro Plan ($229/mo)** or **Venture Plan ($499/mo)**. Tokyo listing (`7203` on JPX) returned HTTP 404 with `"Data not found"` (unsupported or unmapped on the basic endpoint, distinct from a plan restriction).
  - *FMP:* Direct foreign listings (`7203.T`, `NESN.SW`) returned HTTP 402 ("Special Endpoint").
  - *Alpha Vantage:* Returned `Invalid API call` and reached the 25 req/day cap.
  - *Workaround:* US-listed ADRs (**`TM`** on NYSE and **`NSRGY`** on OTC) are confirmed functional on free tiers in USD.
- **Corporate Fundamentals vs. Market Price Feeds:**  
  **SEC EDGAR** provides authoritative, free, public-domain regulatory filings (10-K, 10-Q, 8-K, 20-F, 6-K) and standardized GAAP/IFRS XBRL accounting facts, but **provides zero market price data** (no ticks, quotes, or OHLCV feeds). Coverage is restricted to US domestic filers and registered Foreign Private Issuers (e.g. HSBC, Toyota); unregistered foreign issuers (e.g. Nestlé SA) do not file annual 20-F reports. For normalized JSON statements, **FMP `/stable/`** delivers clean balance sheets, income statements, and cash flows for US equities.
- **Financial News:**  
  **NewsAPI** confirmed successful article retrieval across all 5 search topics, but developer terms restrict usage strictly to `localhost` prototyping with a 24-hour publication delay and strict prohibitions on commercial deployment without a paid business license ($449/mo).
- **Nasdaq Data Link Reassessment:**  
  The legacy `WIKI` free stock dataset ceased updates in March 2018 and is disqualified. Modern equities (Sharadar) require paid subscriptions. Free public datasets (FRED) exist in the catalog. Scripted requests encountered Imperva/Incapsula Web Application Firewall (WAF) anti-bot screening (HTTP 403). The platform is fundamentally an asynchronous econometric data warehouse, not an operational real-time quote API.

---

## 1. Provider Validation Details

```
+-------------------------------------------------------------------------------------------------------------------+
|                                      AUDITED API VALIDATION MATRIX                                                |
+----------------------+--------------------+---------------------+------------------+------------------------------+
| Provider             | Status             | US Equities (EOD)   | Global Equities  | Fundamentals / Disclosures   |
+----------------------+--------------------+---------------------+------------------+------------------------------+
| Alpha Vantage        | Partially Viable   | Confirmed (NVDA)    | UK Only (LSE)    | Minimal / Overview           |
| Twelve Data          | Partially Viable   | Confirmed (NVDA)    | Paid Tier / Omit | None on Free Tier            |
| FMP (/stable/)       | Highly Viable (US) | Confirmed (NVDA)    | US ADRs Only     | Confirmed (Full US 3-Stmt)   |
| NewsAPI              | Prototype Dev Only | N/A (News Only)     | N/A (News Only)  | N/A (Articles Only)          |
| Nasdaq Data Link     | Unsuitable for App | Obsolete (2018 WIKI)| Paid Sub Req.    | Macroeconomic (FRED) Only    |
| SEC EDGAR            | Production Ready   | No Price Data       | Registered FPIs  | Confirmed (Authoritative XBRL|
+----------------------+--------------------+---------------------+------------------+------------------------------+
```

---

## 2. Alpha Vantage

- **Official Documentation:** [https://www.alphavantage.co/documentation/](https://www.alphavantage.co/documentation/)
- **Target Endpoints Tested:**
  - `function=SYMBOL_SEARCH&keywords={query}`
  - `function=TIME_SERIES_DAILY&symbol={symbol}`
- **Authentication:** `apikey` query parameter.
- **Total Tests Executed:** 10 (Tests T01 – T10).

### Empirical Test Results

| Test ID | Symbol / Query | Exchange / Region | HTTP Status | API Status | Latest Date | Currency | Evidence Category & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T01** | NVIDIA | US (NASDAQ) | 200 OK | SUCCESS | N/A | USD | **Confirmed by API test.** Resolved `NVDA`, Equity, US |
| **T02** | HSBC | US (NYSE ADR) | 200 OK | SUCCESS | N/A | USD | **Confirmed by API test.** Resolved `HSBC`, Equity, US |
| **T03** | Toyota | Global | 200 OK | SUCCESS | N/A | EUR | **Confirmed by API test.** Resolved `SCT.LIS` (Toyota Caetano Lisbon) |
| **T04** | Nestle | US OTC | 200 OK | SUCCESS | N/A | USD | **Confirmed by API test.** Resolved `NSRGF`, `NSRGY` |
| **T05** | `NVDA` | NASDAQ (US) | 200 OK | SUCCESS | 2026-11-10 | USD | **Confirmed by API test.** Open: 173.97, High: 174.69, Low: 165.89, Close: 168.89. Returns latest 100 observations (compact). |
| **T06** | `HSBA.LON` | LSE (UK) | 200 OK | SUCCESS | 2026-11-10 | GBp | **Confirmed by API test.** Open: 1354.20, High: 1362.80, Low: 1341.40, Close: 1341.40. Returns latest 100 observations in GBp. |
| **T07** | `7203.TKS` | Tokyo (TSE) | 200 OK | UNSUPPORTED | N/A | N/A | **Not supported on free tier.** `Invalid API call` |
| **T08** | `NESN.SWI` | SIX Swiss | 200 OK | UNSUPPORTED | N/A | N/A | **Not supported on free tier.** `Invalid API call` |
| **T09** | `7203.TYO` | Tokyo (TSE Alt)| 200 OK | UNSUPPORTED | N/A | N/A | **Not supported on free tier.** `Invalid API call` |
| **T10** | `NESN.SW` | SIX Swiss Alt | 200 OK | RATE_LIMITED | N/A | N/A | **Confirmed by API test.** Hit 25 requests/day standard limit |

### Technical Analysis, Depth & Licensing Limits
1. **Free Historical Depth:** Free daily queries return strictly `outputsize=compact` (the most recent **100 data points**, roughly 5 calendar months). Full historical series (`outputsize=full`, covering 20+ years) is a **premium-only feature** and is not accessible on the free plan.
2. **Rate Limits:** Standard free tier is strictly limited to **25 requests per day** and **5 requests per minute**. Hitting this cap returns HTTP 200 containing a throttling notice.
3. **Market Coverage:** Successfully retrieved US (`NVDA`) and London Stock Exchange (`HSBA.LON`) equities. Tokyo and Zurich direct listings are unsupported on the basic tier.
4. **Licensing:** Free tier is strictly for personal evaluation and non-commercial development. Commercial use, redistribution, or public display requires a paid commercial license.

---

## 3. Twelve Data

- **Official Documentation:** [https://twelvedata.com/docs](https://twelvedata.com/docs)
- **Pricing Documentation:** [https://twelvedata.com/pricing](https://twelvedata.com/pricing)
- **Target Endpoints Tested:**
  - `https://api.twelvedata.com/symbol_search?symbol={query}`
  - `https://api.twelvedata.com/time_series?symbol={symbol}&exchange={exchange}&interval=1day`
- **Authentication:** `apikey` query parameter.
- **Total Tests Executed:** 9 (Tests T11 – T18 in Phase 1, plus T56 in Phase 2).

### Empirical Test Results

| Test ID | Symbol / Exchange | MIC Code | HTTP Status | API Status | Latest Date | Currency | Evidence Category & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T11** | `NVDA` | `XNGS` (NASDAQ) | 200 OK | SUCCESS | N/A | USD | **Confirmed by API test.** Resolved `NVDA`, NASDAQ |
| **T12** | `HSBA` | `XLON` (LSE) | 200 OK | SUCCESS | N/A | GBp | **Confirmed by API test.** Resolved `HSBA`, LSE |
| **T13** | `7203` | `XJPX` (JPX) | 200 OK | SUCCESS | N/A | JPY | **Confirmed by API test.** Resolved `7203`, JPX |
| **T14** | `NESN` | `XSWX` (SIX) | 200 OK | SUCCESS | N/A | CHF | **Confirmed by API test.** Resolved `NESN`, SIX |
| **T15** | `NVDA` (NASDAQ) | `XNGS` | 200 OK | SUCCESS | 2026-11-10 | USD | **Confirmed by API test.** Full daily OHLCV & timezone metadata |
| **T16** | `HSBA` (LSE) | `XLON` | 404 Error | TIER_RESTRICTED | N/A | N/A | **Not accessible under free plan.** Body explicitly states: `"This symbol is available starting with the Grow or Venture plan"` |
| **T17** | `7203` (TSE/JPX) | `XJPX` | 404 Error | DATA_NOT_FOUND | N/A | N/A | **Unresolved / Unsupported.** Body states: `"Data not found"` (missing symbol/exchange mapping, distinct from plan restriction) |
| **T18** | `NESN` (SIX) | `XSWX` | 404 Error | TIER_RESTRICTED | N/A | N/A | **Not accessible under free plan.** Body explicitly states: `"This symbol is available starting with the Pro or Venture plan"` |
| **T56** | Diagnostic Probe | Composite | 404 Error | AUDIT_CONFIRMED| N/A | N/A | **Confirmed by API test & docs.** Disaggregated 404 response bodies and audited plan requirements |

### Current Official Plan Names & Pricing
- **Basic Plan (Free, $0/month):** 8 API credits/minute, 800 credits/day. Real-time US equities, forex, crypto. Personal/testing use only.
- **Grow Plan ($79/month):** Up to 377 API credits/minute, no daily request cap. Covers 20+ global markets, including London Stock Exchange (LSE) end-of-day equities.
- **Pro Plan ($229/month):** Up to 1,597 API credits/minute, 1,500 WebSocket credits. Covers 70+ global markets, including SIX Swiss Exchange and real-time EU data.
- **Ultra Plan ($999/month):** Up to 10,946 API credits/minute. Covers 80+ markets.
- **Commercial / Business Tiers:** **Venture Plan** starts at **$499/month**, **Enterprise Plan** at **$1,099/month**.

### Disaggregation of HTTP 404 Response Bodies
- `HSBA` on `LSE` is an **explicit paid-tier restriction** (requires Grow $79/mo or Venture $499/mo).
- `NESN` on `SIX` is an **explicit paid-tier restriction** (requires Pro $229/mo or Venture $499/mo).
- `7203` on `JPX` returned `"Data not found"`. It is an unsupported symbol/exchange mapping on the basic endpoint, rather than an explicit upgrade prompt.

---

## 4. Financial Modeling Prep (FMP)

- **Official Documentation:** [https://site.financialmodelingprep.com/developer/docs](https://site.financialmodelingprep.com/developer/docs)
- **Target Endpoints Tested:**
  - Phase 1 (Legacy): `/api/v3/search`, `/api/v3/profile`, `/api/v3/income-statement`, `/api/v3/balance-sheet-statement`, `/api/v3/cash-flow-statement`, `/api/v3/historical-price-full`
  - Phase 2 (Stable): `/stable/search-name`, `/stable/search-symbol`, `/stable/profile`, `/stable/income-statement`, `/stable/balance-sheet-statement`, `/stable/cash-flow-statement`, `/stable/historical-price-eod/full`, `/stable/quote`
- **Authentication:** `apikey` query parameter.
- **Total Tests Executed:** 23 (Tests T19 – T33 in Phase 1; Tests T48 – T55 in Phase 2).

### Empirical Test Results

| Test ID | Route / Endpoint | HTTP Status | Status Classification | Evidence Category & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **T19–T33** (15 Tests) | `/api/v3/*` (Search, Profiles, Stmts, Prices) | 403 Forbidden | LEGACY_DEPRECATED | **Confirmed by API test.** Legacy `/api/v3/` routes are discontinued for API keys generated after August 31, 2025 |
| **T48** | `/stable/search-name?query=NVIDIA` | 200 OK | SUCCESS | **Confirmed by API test.** Resolved `NVDA`, `NVDA.NE` |
| **T49** | `/stable/profile?symbol=NVDA` | 200 OK | SUCCESS | **Confirmed by API test.** Price: 168.89, MktCap: $4.07T, Beta: 2.216 |
| **T50** | `/stable/profile?symbol=HSBC` & `TM` | 200 OK | SUCCESS | **Confirmed by API test.** US-listed ADRs accessible on free plan |
| **T51** | `/stable/profile` (`HSBA.L`, `7203.T`, `NESN.SW`) | 402 Payment Req | TIER_RESTRICTED | **Not accessible under free plan.** "Special Endpoint" requiring paid plan |
| **T52** | `/stable/income-statement?symbol=NVDA` | 200 OK | SUCCESS | **Confirmed by API test.** FY2026 audited revenue: $215.9B |
| **T53** | `/stable/balance-sheet-statement?symbol=NVDA`| 200 OK | SUCCESS | **Confirmed by API test.** 3 annual periods returned |
| **T54** | `/stable/cash-flow-statement?symbol=NVDA` | 200 OK | SUCCESS | **Confirmed by API test.** Operating cash flow, CapEx, FCF returned |
| **T55** | `/stable/historical-price-eod/full?symbol=NVDA`| 200 OK | SUCCESS | **Confirmed by API test.** Open: 173.98, High: 174.69, Low: 165.89, Close: 168.89 |

### Technical Analysis & Plan Restrictions
1. **Architectural Migration:** Keys issued after August 31, 2025 must use `/stable/` endpoints. All legacy `/api/v3/` routes return HTTP 403.
2. **Fundamentals Powerhouse:** For US equities, FMP `/stable/` is the fastest, cleanest pre-parsed JSON fundamentals feed tested.
3. **Foreign Coverage:** Direct foreign tickers (`.L`, `.T`, `.SW`) return HTTP 402 ("Special Endpoint"). However, foreign corporations with US ADRs (`HSBC`, `TM`) are accessible on the free plan.
4. **Limits & Licensing:** 250 requests per day on the free tier. Personal evaluation only; commercial use requires a paid business subscription.

---

## 5. NewsAPI

- **Official Documentation:** [https://newsapi.org/docs](https://newsapi.org/docs)
- **Target Endpoints Tested:**
  - `https://newsapi.org/v2/everything?q={query}&sortBy=publishedAt&pageSize=3`
- **Authentication:** `apiKey` query parameter.
- **Total Tests Executed:** 5 (Tests T34 – T38).

### Empirical Test Results

| Test ID | Search Topic | Query String | HTTP Status | Articles Found | Evidence Category & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T34** | NVIDIA | `NVIDIA stock OR NVDA` | 200 OK | 3 | **Confirmed by API test.** WinFuture, recent articles |
| **T35** | HSBC | `HSBC Holdings` | 200 OK | 3 | **Confirmed by API test.** Times of India, recent articles |
| **T36** | Toyota | `Toyota Motor` | 200 OK | 3 | **Confirmed by API test.** El País, recent articles |
| **T37** | Nestlé | `Nestle SA` | 200 OK | 3 | **Confirmed by API test.** Le Point, recent articles |
| **T38** | Global Markets| `global stock markets OR Wall Street` | 200 OK | 3 | **Confirmed by API test.** Bloomberg / Wire feeds |

### Developer Plan Restrictions & Licensing
1. **Localhost Restriction:** Developer plan requests from production server IPs or domains are blocked (`CORS` / origin restrictions).
2. **Latency & Archive:** News is delayed by up to 24 hours; historical search is limited to 1 month.
3. **Request Limit:** 100 requests per 24 hours.
4. **Commercial Prohibition:** Commercial use or public deployment is strictly prohibited on the Developer tier. Commercial licenses start at **$449/month**.
5. **Verdict:** Suitable strictly for local prototype development; unusable for production without commercial licensing.

---

## 6. Nasdaq Data Link

- **Official Documentation:** [https://docs.data.nasdaq.com/](https://docs.data.nasdaq.com/)
- **Target Endpoints Tested:**
  - `https://data.nasdaq.com/api/v3/datasets.json`
  - `https://data.nasdaq.com/api/v3/datasets/FRED/GDP.json`
  - `https://data.nasdaq.com/api/v3/datasets/WIKI/NVDA.json`
  - `https://data.nasdaq.com/api/v3/datatables/SHARADAR/SEP.json`
- **Authentication:** `api_key` query parameter.
- **Total Tests Executed:** 5 (Tests T39 – T42 in Phase 1, plus T57 in Phase 2).

### Empirical Test Results & Independent Assessment

| Test ID | Target Dataset | Dataset Purpose | HTTP Status | Status Classification | Evidence Category & Observations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T39** | `datasets.json?query=stock` | General Search | 403 Forbidden | WAF_BLOCKED | **Confirmed by API test.** Imperva / Incapsula anti-bot challenge |
| **T40** | `FRED/GDP` | US Macro Indicator | 403 Forbidden | WAF_BLOCKED | **Supported by docs / Blocked by WAF.** Imperva challenge |
| **T41** | `WIKI/NVDA` | Legacy Free Equity | 403 Forbidden | WAF_BLOCKED (Dataset frozen 2018) | **Not supported.** Dataset ended March 2018; WAF challenge |
| **T42** | `SHARADAR/SEP` | Modern US Equities | 200 OK / 403 | PREMIUM_LOCKED | **Not accessible under free plan.** Commercial subscription required |
| **T57** | WAF Defense Diagnostic | Client Request Audit| 403 Forbidden | WAF_CHALLENGE_DIAGNOSED | **Confirmed by API test & docs.** Anti-bot screening on automated client |

### Technical Reassessment
1. **Dataset Independence:** The discontinuation of the free `WIKI` dataset (frozen in March 2018) does not reflect the operational status of other databases. Free macroeconomic datasets (e.g. Federal Reserve FRED data) remain active in the catalog.
2. **Commercial Equities:** Modern equity databases (e.g., Sharadar Core US Equities `SEP`) are active and maintained, but require **commercial paid database subscriptions** ($50 to $200+/month).
3. **WAF Screening:** Programmatic client requests triggered Imperva/Incapsula Web Application Firewall challenges (HTTP 403). This represents an infrastructure/client screening challenge rather than a total platform outage.
4. **Architectural Role:** Nasdaq Data Link is an asynchronous tabular research repository designed for quantitative and econometric analysis, not an operational, low-latency stock quote API for an interactive market assistant.

---

## 7. SEC EDGAR (Public API)

- **Official Documentation:** [https://www.sec.gov/edgar/sec-api-documentation](https://www.sec.gov/edgar/sec-api-documentation)
- **Target Endpoints Tested:**
  - `https://www.sec.gov/files/company_tickers.json`
  - `https://data.sec.gov/submissions/CIK{cik.zfill(10)}.json`
  - `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik.zfill(10)}.json`
- **Authentication:** None required. Mandatory User-Agent header: `Sample Company Name AdminContact@<sample company domain>.com`.
- **Total Tests Executed:** 5 (Tests T43 – T47).

### Empirical Test Results

| Test ID | Target Entity | Identifier / CIK | Filing Classification | HTTP Status | Evidence Category & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T43** | Master Ticker Index | Directory | 10,414 Tickers | 200 OK | **Confirmed by API test.** Maps tickers to CIK numbers |
| **T44** | NVIDIA Corp | CIK 0001045810 | Domestic US Filer | 200 OK | **Confirmed by API test.** Forms 10-K, 10-Q, 8-K |
| **T45** | HSBC Holdings plc | CIK 0001140465 | Registered Foreign Issuer | 200 OK | **Confirmed by API test.** Annual Form 20-F, interim Form 6-K |
| **T46** | Toyota Motor Corp | CIK 0001094517 | Registered Foreign Issuer | 200 OK | **Confirmed by API test.** Annual Form 20-F, interim Form 6-K |
| **T47** | NVIDIA XBRL Facts | CIK 0001045810 | Standardized GAAP Facts | 200 OK | **Confirmed by API test.** 627 standardized US-GAAP accounting concepts |

### Entity Eligibility, Scope & Boundary Clarifications
1. **Filing Eligibility (Not Universal Global Coverage):**
   - Covers US domestic publicly traded corporations (10-K, 10-Q, 8-K).
   - Covers registered Foreign Private Issuers (FPIs) with US-listed securities (20-F, 6-K), such as HSBC Holdings plc and Toyota Motor Corporation.
   - Non-US corporations without US public registration or operating strictly under Rule 12g3-2(b) exempt status (such as Nestlé SA, which trades OTC as `NSRGY` / `NSRGF`) **do not file annual financial reports on EDGAR**.
2. **Absence of Market Price Data:**
   - SEC EDGAR is strictly an **accounting, regulatory, and corporate disclosure repository**.
   - It provides **zero market price feeds** (no tick data, no daily OHLCV prices, no volume time series, no bid/ask quotes).
3. **Fair Access Policy:**
   - Strict ceiling of **no more than 10 requests per second**.
   - Mandatory User-Agent header declaring the user/entity and valid contact email.
4. **Public Domain Licensing:**
   - Unrestricted commercial, internal, and public display rights without subscription fees or licensing agreements.

---

## 8. Summary of Reconciled Validation Artifacts

All empirical run logs, raw outputs, and schemas have been audited and preserved in `E:\finTech-inkVector\research\provider-validation`:
- `provider_test_results.json`: 57 itemized test records (`T01`–`T57`) with sanitized errors, disaggregated 404 details, and audit metadata.
- `PROVIDER_COMPARISON.md`: Cross-provider comparative matrix across 14 operational, technical, and legal dimensions.
- `test_execution_summary.md`: Detailed test ledger, execution telemetry, and root-cause analyses.
