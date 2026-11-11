# AI Stock Market Assistant — Multi-Stock Support & Global Instrument Resolution

**Document Purpose:** Multi-Exchange Instrument Models, Provider Routing, and Watchlist Integration

---

## 1. Multi-Stock Resolution Principles

The core mandate of this product rescue is enabling seamless multi-stock research while rigorously preserving exchange identity:
1. **Never Silently Substitute an ADR for a Primary Listing:** If a user requests Toyota Tokyo (`7203.T`), the application represents the Tokyo Stock Exchange primary listing in Japanese Yen (JPY), linking the US ADR (`TM`) as an optional proxy rather than secretly mutating the ticker.
2. **Provider-Specific Symbol Normalization:** Different providers employ conflicting ticker symbologies (e.g. `HSBA.LON` on Alpha Vantage vs. `HSBA.L` on FMP vs. `HSBA` on Twelve Data LSE). The resolver manages this mapping transparently.
3. **Multi-Stock Watchlist:** Provides real-time quotes, daily changes, and data freshness across diversified global holdings.

---

## 2. Canonical Tested Instruments Matrix

The following instruments have been tested and verified across market data endpoints:

| Display Ticker | Company Name | Primary Exchange | Country | Currency | Asset Type | Listing Type | Primary Provider | Fallback Provider |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **NVDA** | NVIDIA Corporation | NASDAQ (XNGS) | United States | USD | Common Stock | Primary | Twelve Data | FMP Stable |
| **AAPL** | Apple Inc. | NASDAQ (XNGS) | United States | USD | Common Stock | Primary | Twelve Data | FMP Stable |
| **MSFT** | Microsoft Corporation | NASDAQ (XNGS) | United States | USD | Common Stock | Primary | Twelve Data | FMP Stable |
| **GOOGL** | Alphabet Inc. (Class A) | NASDAQ (XNGS) | United States | USD | Common Stock | Primary | Twelve Data | FMP Stable |
| **AMZN** | Amazon.com Inc. | NASDAQ (XNGS) | United States | USD | Common Stock | Primary | Twelve Data | FMP Stable |
| **META** | Meta Platforms Inc. | NASDAQ (XNGS) | United States | USD | Common Stock | Primary | Twelve Data | FMP Stable |
| **TSLA** | Tesla Inc. | NASDAQ (XNGS) | United States | USD | Common Stock | Primary | Twelve Data | FMP Stable |
| **AMD** | Advanced Micro Devices Inc. | NASDAQ (XNGS) | United States | USD | Common Stock | Primary | Twelve Data | FMP Stable |
| **AVGO** | Broadcom Inc. | NASDAQ (XNGS) | United States | USD | Common Stock | Primary | Twelve Data | FMP Stable |
| **JPM** | JPMorgan Chase & Co. | NYSE (XNYS) | United States | USD | Common Stock | Primary | Twelve Data | FMP Stable |
| **HSBA.L** | HSBC Holdings plc | LSE (XLON) | United Kingdom | GBP | Common Stock | Primary | Alpha Vantage (`HSBA.LON`) | FMP (`HSBA.L`) |
| **7203.T** | Toyota Motor Corporation | TSE (XJPX) | Japan | JPY | Common Stock | Primary | FMP Stable | Twelve Data |
| **NESN.SW** | Nestlé S.A. | SIX Swiss (XSWX) | Switzerland | CHF | Common Stock | Primary | FMP Stable | Twelve Data |
| **TM** | Toyota Motor Corporation (ADR) | NYSE (XNYS) | United States | USD | ADR | Secondary/ADR | Twelve Data | FMP Stable |
| **NSRGY** | Nestlé S.A. (Sponsored ADR) | OTC (OTCM) | United States | USD | ADR | Secondary/ADR | FMP Stable | Alpha Vantage |

---

## 3. Search & Autocomplete Endpoints

### 1. `GET /api/v1/market/search?query={q}&exchange={mic}&limit={n}`
- **Fuzzy & Prefix Scoring:** Returns highest-relevance instruments based on ticker match, company name substring, exchange, country, and asset type.
- **Unified Schema:** Returns `NormalizedInstrument` models with `display_symbol`, `exchange_name`, `country`, `currency`, `is_adr`, and `listing_type`.

### 2. `GET /api/v1/market/instruments`
- Returns the complete registered canonical universe.

### 3. `GET /api/v1/market/watchlist`
- Concurrently queries quotes for the core default watchlist: `NVDA`, `AAPL`, `MSFT`, `TSLA`, `AMZN`, `HSBA.L`.
- Caches results for 60 seconds using in-memory TTL cache to prevent provider rate-limit exhaustion.

---

## 4. Verification Evidence

- `tests/unit/test_instrument_search.py::test_canonical_universe_coverage`: **PASSED**
- `tests/unit/test_instrument_search.py::test_search_by_ticker`: **PASSED**
- `tests/unit/test_instrument_search.py::test_search_by_company_name`: **PASSED**
- `tests/unit/test_instrument_search.py::test_search_by_exchange_and_country`: **PASSED**
- `tests/unit/test_instrument_search.py::test_adr_preservation_not_silent_substitution`: **PASSED**
- `tests/unit/test_instrument_search.py::test_watchlist_structure`: **PASSED**
- `tests/integration/test_e2e_api.py::test_instrument_search_and_watchlist_e2e`: **PASSED**
