# INKVECTOR — Multi-Provider Data Ingestion & Normalization Engine

## 1. Engine Mission

Financial market data across the global web is inherently fragmented: providers use differing symbology (`AAPL` vs `AAPL.US` vs `NASDAQ:AAPL`), differing date formats, disparate payload structures, and conflicting naming conventions.

The **INKVECTOR Multi-Provider Data Engine** (`src/backend/data_ingestion/`) acts as an abstraction barrier between raw external provider APIs and the application domain models.

---

## 2. Core Architectural Components

### 2.1 The Router (`src/backend/data_ingestion/router.py`)
The `FinancialDataRouter` acts as the traffic controller:
- Inspects client requests and determines eligible providers based on asset class and jurisdiction.
- Tracks provider rate limits, consecutive HTTP errors, and response latencies.
- Coordinates concurrency via `asyncio.gather` for peer equity comparison.
- Catches HTTP 401, 402, 404, 429, and 500 status codes, logging structured diagnostic telemetry before activating secondary fallbacks.

### 2.2 Provider Adapters
Each external data source implements a clean adapter interface deriving from `BaseProvider`:
- `TwelveDataProvider` (`src/backend/data_ingestion/twelve_data.py`): Real-time pricing, WebSocket streaming, and candlestick series.
- `FMPProvider` (`src/backend/data_ingestion/fmp.py`): Multi-year SEC balance sheets, cash flows, and income statements.
- `AlphaVantageProvider` (`src/backend/data_ingestion/alpha_vantage.py`): News sentiment analysis and compact historical bars.
- `SecEdgarClient` (`src/backend/data_ingestion/sec_edgar.py`): Direct REST integration to official SEC XBRL company facts API.
- `ECBProvider` (`src/backend/data_ingestion/ecb.py`): European Central Bank daily foreign exchange spot rates.

---

## 3. Data Normalization Pipelines

### 3.1 Currency Normalization
All monetary positions are normalized using live ECB reference rates. If a user holds `HSBA` in GBP and requests a portfolio valuation in USD:
1. Engine resolves GBP/EUR and USD/EUR reference rates from the ECB feed.
2. Cross-rate calculation:
   $$\text{Rate}_{\text{GBP}\to\text{USD}} = \frac{\text{Rate}_{\text{USD/EUR}}}{\text{Rate}_{\text{GBP/EUR}}}$$
3. Original cost, live quote, and market value are converted and tagged with `exchange_rate_to_base`.

### 3.2 Symbology Translation
The `InstrumentService` maintains bidirectional symbology maps:
```python
{
    "canonical": "7203.T",
    "twelve_data": "7203:XTKS",
    "fmp": "7203.T",
    "alpha_vantage": "7203.TOK",
    "adr_symbol": "TM"
}
```
When a query requests data for Tokyo Stock Exchange entity `7203.T`, the router transparently swaps the symbol to `7203:XTKS` before dispatching to Twelve Data.

---

## 4. Resilience & Error Handling

1. **Rate Limit Throttling (HTTP 429):** The router automatically switches to the next available tier without crashing the user session or displaying a blank screen.
2. **Subscription Tier Enforcement (HTTP 402):** Endpoints that require paid enterprise subscriptions (such as bulk stock lists) are isolated and replaced with free compliant endpoints (such as `/search-name` or SEC EDGAR).
3. **No Phantom Data Policy:** The engine never hallucinates quotes or balance sheets. If all providers are inaccessible, the engine explicitly alerts the user with provenance status `UNAVAILABLE` and prompts a retry.
