# INKVECTOR — MASTER UI/UX REDESIGN AUDIT

## 1. Executive Summary

This audit assesses the frontend and user experience architecture of the **INKVECTOR AI Stock Market Assistant** platform, establishing the foundation for its complete transformation into an institutional-grade financial intelligence application.

The backend is verified and operational with 53 passing automated tests across FastAPI endpoints, market data routers, SEC EDGAR XBRL ingestion, ECB foreign exchange normalization, Loughran-McDonald sentiment parsing, isolated subprocess Python sandboxing, and Celery asynchronous task execution.

Prior to this redesign, the interface suffered from several critical structural limitations:
1. Single-stock tunnel vision (disproportionately focused on NVIDIA without an open multi-stock discovery workspace).
2. Monolithic dark styling without semantic CSS tokens or high-contrast light theme support.
3. Card bloat and lack of clear financial information hierarchy.
4. Minimal global navigation without persistent collapsible states, command palette, or global instrument search.
5. Incomplete user journeys for portfolio spreadsheet ingestion, multi-stock comparison, and background job polling.

---

## 2. Current Frontend Structure

- **Framework**: React 19.0.0 (`@types/react` 19.0.10)
- **Bundler & Toolchain**: Vite 6.2.0 + TypeScript 5.7.3 (`tsc && vite build`)
- **Styling Architecture**: Tailwind CSS 4.0.9 via `@tailwindcss/vite`
- **Charting**: TradingView Lightweight Charts 4.2.1 (`lightweight-charts`) + Recharts 2.15.1
- **3D Graphics Engine**: Three.js 0.187.0 (`three`, `@types/three`)
- **Icons**: Lucide React 1.16.0 (`lucide-react`)

### Existing Screens & Views
| Screen ID | Component / View | Status Before | Redesign Target |
|---|---|---|---|
| Screen 1 | `AuthModal.tsx` / `AuthVisual3D.tsx` | Missing (implicit) | Modal with 3D glass geometry & demo bypass |
| Screen 2 | `OnboardingWizard.tsx` | Missing | 6-step setup wizard (currency, hubs, watchlist) |
| Screen 3 | `OverviewDashboard.tsx` | Rudimentary | Institutional overview with 3D globe & indices |
| Screen 4 | `MarketsDiscoveryView.tsx` | Partial / single stock | Multi-stock discovery across 6 exchanges |
| Screen 5 | `StockDetailWorkspace.tsx` | Basic research tab | Tabbed workspace: overview, chart, 3 statements, technicals |
| Screen 6 | `WatchlistsWorkspace.tsx` | Drawer only | Dedicated multi-watchlist manager |
| Screen 7 | `PortfolioWorkspace.tsx` | Raw upload only | Multi-step preview/mapping, HHI, What-If simulation |
| Screen 8 | `ResearchWorkspace.tsx` | Not implemented | Side-by-side peer ratio comparison matrix |
| Screen 9 | `NewsSentimentView.tsx` | Simple news list | Polarity gauge, breakdown, publisher links |
| Screen 10 | `AiAssistantView.tsx` | Generic chat | 3D neural mesh, processing stages, citations |
| Screen 11 | `AnalysisLabView.tsx` | Split views | Sandboxed Python runner + Celery jobs monitor |
| Screen 12 | `SavedResearchView.tsx` | Not implemented | Persisted dossiers, reports, markdown export |
| Screen 13 | `SettingsView.tsx` | Not implemented | Theme switcher, currency, provider health, shortcuts |

---

## 3. Backend API Endpoints & Screen Mapping

All screens directly integrate with verified FastAPI backend routes:

1. **Market Data & Technicals (`/api/v1/market`)**:
   - `GET /market/search`: Unified instrument search across global exchange MICs.
   - `GET /market/quote`: Live normalized quote with bid/ask, change, currency, and freshness.
   - `GET /market/history`: Historical OHLC candlestick daily bars.
   - `GET /market/technicals`: Computed SMA (50, 200), RSI (14), MACD, Bollinger Bands.
   - `GET /market/watchlist`: Multi-stock institutional watchlist.
2. **Fundamentals (`/api/v1/fundamentals`)**:
   - `GET /fundamentals/overview`: Enterprise profile + latest 3 statements + calculated ratios.
   - `GET /fundamentals/profile`: Company description, market cap, sector, industry, CIK.
   - `GET /fundamentals/statements`: Multi-period Income Statement, Balance Sheet, Cash Flow.
3. **Conversational AI (`/api/v1/chat`)**:
   - `POST /chat/message`: AI reasoning engine with dynamic tool execution.
   - `GET /chat/history`: Session trajectory.
4. **Portfolio Management (`/api/v1/portfolio`)**:
   - `POST /portfolio/upload-spreadsheet`: Excel/CSV fuzzy ingestion & ECB FX normalization.
   - `POST /portfolio/evaluate`: Position market value, unrealized P/L, and Herfindahl index.
   - `POST /portfolio/simulate-what-if`: Market shock stress testing (-10%, +15%).
5. **News & Sentiment (`/api/v1/news`)**:
   - `GET /news/sentiment`: Loughran-McDonald financial dictionary polarity score & sample breakdown.
   - `GET /news/search`: Keyword news search across accredited publications.
6. **Python Sandbox (`/api/v1/sandbox`)**:
   - `POST /sandbox/execute`: Secure subprocess execution with timeout and output capture.
7. **Task Worker (`/api/v1/jobs`)**:
   - `POST /jobs/research`: Enqueue deep research Celery job.
   - `GET /jobs/status/{task_id}`: Real-time task status polling.
   - `GET /jobs/health`: Redis broker and worker connectivity healthcheck.

---

## 4. Key Design & Usability Deficiencies Resolved

1. **Theme Inflexibility**: Previously locked to dark slate colors without dynamic CSS variables. Resolved by creating a unified `ThemeContext` supporting Dark Fintech (`#0B1016`) and Light Studio (`#F4F7FA`).
2. **Global Navigation**: Lack of collapsed sidebar states, command palette, and breadcrumbs. Resolved by building `CommandPalette.tsx` (Ctrl+K) and persistent collapsible `AppShell.tsx`.
3. **Immersive 3D Purposefulness**: 3D was previously isolated to a single static globe. Expanded to three purposeful Three.js experiences:
   - Global Financial Hub Globe (telemetry on markets).
   - AI Processing Neural Network (reacts to real AI pipeline execution states).
   - Abstract Geometric Glass Composition (login and security auth).
4. **Data Integrity & Grounding**: No simulated or fabricated numbers. All financial figures are backed by validated provider responses or clear empty/loading states.

---

## 5. Implementation Strategy

- **Phase 0**: Repository audit & screen mapping (Complete).
- **Phase 1**: Design system & semantic CSS tokens (Complete).
- **Phase 2**: Navigation shell, Command palette, Theme switcher (Complete).
- **Phase 3**: Core financial screens (Overview, Markets, Stock Detail, Watchlists) (Complete).
- **Phase 4**: Portfolio & Excel import multi-step workflow (Complete).
- **Phase 5**: Intelligence workspaces (AI Assistant, Analysis Lab, News, Saved Research, Settings) (Complete).
- **Phase 6**: Three.js 3D interactive visualizations (Complete).
- **Phase 7**: End-to-end verification and documentation (Complete).
