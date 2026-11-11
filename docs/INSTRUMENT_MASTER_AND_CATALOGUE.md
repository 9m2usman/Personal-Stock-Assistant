# INKVECTOR — Normalized Global Instrument Master & Stock Catalogue

## 1. Architectural Overview

The **INKVECTOR Normalized Global Instrument Master** represents the institutional single source of truth for all tradable equities, primary cross-border listings, and American Depositary Receipts (ADRs). Rather than relying on a static, toy universe of ~12 hardcoded tickers, INKVECTOR implements a multi-tiered, database-backed directory capable of scaling to over 10,000 public entities.

### Key Pillars
1. **Authoritative Primary Sources:** Direct ingestion from the **U.S. Securities and Exchange Commission (SEC EDGAR)** corporate registry (`company_tickers.json`) supplying 10,405 official CIK-to-ticker mappings, supplemented by **Twelve Data** (`/stocks?exchange=NASDAQ`) and curated global exchange leaders.
2. **Canonical Data Normalization:** Every equity record maps to standard ISO 10383 Market Identifier Codes (MIC), ISO 3166-1 alpha-3 country identifiers, ISO 4217 currency codes, and SEC Central Index Keys (CIK).
3. **Cross-Border ADR Resolution:** Dual-listed equities link foreign primary listings (e.g., `7203.T`, `HSBA.L`, `NESN.SW`) with their corresponding U.S. ADR representations (`TM`, `NSRGY`) to enable continuous multi-jurisdiction arbitrage and comparison.

---

## 2. Normalized Data Model Specification

The instrument master is persisted in the application database (`instruments` table) and defined in `src/backend/models/instrument.py` and `src/backend/data_ingestion/base.py`:

```python
class NormalizedInstrument(BaseModel):
    id: str                       # Canonical composite ID (e.g., "NASDAQ_AAPL", "XLON_HSBA")
    company_name: str             # Legal corporate name
    display_symbol: str           # User-facing ticker (e.g., "AAPL", "HSBA.L", "7203.T")
    provider_symbols: Dict[str, str] # Provider-specific symbology mappings
    exchange_mic: str             # ISO 10383 MIC (e.g., "XNAS", "XNYS", "XLON", "XJPX", "XSWX")
    exchange_name: str            # Human-readable exchange name
    country: str                  # Country of domicile
    currency: str                 # Trading currency (USD, GBP, JPY, CHF, EUR)
    instrument_type: str          # Common Stock, ADR, ETF, Index
    listing_type: str             # PRIMARY, DUAL_LISTED, ADR, SECONDARY
    is_adr: bool                  # Boolean flag for depositary receipt
    related_adr_symbol: Optional[str] # Pointer to US ADR if international primary
    cik: Optional[str]            # SEC EDGAR Central Index Key
    isin: Optional[str]           # International Securities Identification Number
    sector: Optional[str]         # GICS Sector classification
    industry: Optional[str]       # GICS Industry classification
    is_active: bool               # Active listing status
    provider_availability: Dict[str, bool] # Real-time provider capability flags
```

---

## 3. Supported Global Exchange Nodes

| Exchange Name | MIC Code | Country | Base Currency | Symbology Pattern | Example Tickers |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NASDAQ Stock Market** | `XNAS` / `NASDAQ` | United States | USD | `TICKER` | `NVDA`, `AAPL`, `MSFT`, `AMZN`, `GOOGL` |
| **New York Stock Exchange** | `XNYS` / `NYSE` | United States | USD | `TICKER` | `TSLA`, `JPM`, `BRK.B`, `LLY`, `WMT` |
| **London Stock Exchange** | `XLON` / `LSE` | United Kingdom | GBP | `TICKER.L` / `TICKER` | `HSBA.L`, `SHEL.L`, `AZN.L` |
| **Tokyo Stock Exchange** | `XJPX` / `TSE` | Japan | JPY | `NUMERIC.T` / `NUMERIC` | `7203.T` (Toyota), `6758.T` (Sony), `8306.T` (MUFG) |
| **SIX Swiss Exchange** | `XSWX` / `SIX` | Switzerland | CHF | `TICKER.SW` / `TICKER` | `NESN.SW` (Nestlé), `NOVN.SW` (Novartis), `ROG.SW` (Roche) |
| **Frankfurt Stock Exchange** | `XFRA` / `FWB` | Germany | EUR | `TICKER.DE` / `TICKER` | `SAP.DE`, `SIE.DE`, `BMW.DE` |

---

## 4. SEC EDGAR Ingestion Pipeline

### Data Source
- **Official SEC Endpoint:** `https://www.sec.gov/files/company_tickers.json`
- **Total Entities Available:** 10,405 public companies
- **Protocol:** HTTPS GET with required institutional User-Agent header (`FinancialAssistant/1.0.0 (research@financialassistant.internal)`).
- **Service Implementation:** `src/backend/services/catalog_sync_service.py`

### Ingestion Flow
```
[SEC EDGAR API] ──> [catalog_sync_service] ──> [CIK Normalizer (10 digits)]
                                                      │
                                                      ▼
[SQLite / Postgres Database] <── [Batch Upsert] <── [NormalizedInstrument Master]
```

### Administrative Endpoints
- `GET /api/v1/market/instruments/paginated`: Retrieves paginated instruments with full text search, exchange filters, jurisdiction filters, and asset class filters.
- `GET /api/v1/market/instruments/stats`: Returns live database count of total instruments, primary equities, ADRs, active exchanges, and domestic vs. international breakdown.
- `POST /api/v1/market/instruments/sync?source=sec_edgar`: Triggers asynchronous or direct sync from the SEC EDGAR company directory.

---

## 5. UI Integration

The frontend **Markets Discovery Workspace** (`src/frontend/src/views/MarketsDiscoveryView.tsx`) features:
1. **Global Telemetry Ribbon:** Real-time metrics showing total instruments (10,400+), active exchanges, primary common equities, and ADRs.
2. **Interactive Search & Facets:** Multi-field filter by exchange tabs, jurisdiction dropdown, asset class pills, and debounced text search.
3. **Data Availability Badges:** Every instrument card displays active capabilities: `Quotes`, `History`, `Fundamentals`, `News`, `Technicals`.
4. **Seamless Navigation:** One-click transition into the **Stock Detail Workspace** and **Technical Analysis Studio**.
