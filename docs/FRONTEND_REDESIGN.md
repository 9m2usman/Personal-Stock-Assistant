# AI Stock Market Assistant — Frontend Architecture & UI/UX Redesign

**Design Benchmark:** TradingView, Koyfin, Bloomberg Terminal, Institutional Financial Workstations  
**Technology Stack:** React 19, TypeScript, Tailwind CSS, TradingView Lightweight Charts (v4.2.1), Three.js, Lucide Icons

---

## 1. Visual Direction & Design Philosophy

The redesign transforms the user experience from an amateur single-ticker prototype into a high-density, institutional-grade financial workspace:

- **Color Palette:** Deep obsidian navy (`#020617`, `#090d16`, `#0f172a`) with subtle structural borders (`#1e293b`, `#334155`).
- **Semantic Accents:** Emerald Green (`#10b981`) for positive returns, upward candles, and active sessions; Rose Red (`#ef4444`) for negative returns and downward candles; Sky Blue (`#38bdf8`) for medium-term trend overlays (SMA 50); Amber (`#f59e0b`) for long-term baseline (SMA 200); Purple (`#a855f7`) for RSI indicators.
- **Typography:** High-legibility monospaced figures (`font-mono`) for all prices, tickers, and financial ratios to prevent layout shifting during price updates.
- **Information Density:** Clean data tables with zero decorative clutter, high-contrast badges, and immediate access to primary actions.

---

## 2. Main Application Shell (`AppShell.tsx`)

The application shell provides the master coordination framework for the 7 specialized analytical workspaces:

### A. Universal Autocomplete Search Bar
- Positioned prominently in the top header.
- Evaluates search queries against both ticker symbols and company names.
- Dropdown card display includes:
  - Display ticker (e.g. `NVDA`, `AAPL`, `HSBA.L`, `7203.T`)
  - Full company name
  - Primary exchange MIC & name (`NASDAQ`, `LSE`, `TSE`, `SIX`)
  - Country and settlement currency
  - Listing type badge (`Primary` vs. `ADR`)
- Selecting any result immediately switches the active instrument across all views.

### B. Quick-Switcher Ticker Bar
- Instant access pills for core institutional equities: `[ NVDA ] [ AAPL ] [ MSFT ] [ TSLA ] [ AMZN ] [ HSBA.L ]`.
- Active ticker is highlighted in solid emerald with clear visual state.

### C. Live Watchlist Drawer (`WatchlistDrawer.tsx`)
- Slide-out right panel displaying real-time market data across diversified holdings.
- Displays: Ticker, Company, Exchange, Latest Price, Daily Change, Daily Percentage Change, Volume, Data Freshness, and Provider Source.
- Built-in search to immediately add any instrument to the current session.

### D. System Telemetry Indicators
- **FastAPI Engine:** Shows live pulse indicator for backend connection.
- **Workers Status:** Indicates whether Celery/Redis is operating in live distributed mode or graceful eager fallback.
- **Providers Badge:** Confirms connected multi-provider market feeds.

---

## 3. Upgraded Candlestick Chart Engine (`CandlestickChart.tsx`)

Built on **TradingView Lightweight Charts v4.2.1**, the charting component meets professional quantitative standards:

1. **OHLC Data Validation:**
   - Enforces `High >= max(Open, Close)` and `Low <= min(Open, Close)`.
   - Filters out non-numeric values and duplicate timestamps.
   - Sorts time-series data ascending by date before rendering.
2. **Chart Display Modes:**
   - **Candlestick Mode:** Traditional green/up (`#10b981`) and red/down (`#ef4444`) bodies and wicks.
   - **Line Mode:** High-contrast 2px emerald line.
   - **Area Mode:** Subtle gradient fill below the close price.
3. **Indicator Overlays & Sub-panels:**
   - **Volume Histogram:** Integrated into the lower portion of the price canvas with color-coded bars matching candle direction.
   - **SMA 50 Overlay:** Sky Blue trend line (`#38bdf8`).
   - **SMA 200 Overlay:** Amber long-term baseline (`#f59e0b`).
   - **RSI Sub-Panel:** 14-day Wilder RSI in purple (`#a855f7`) with dashed overbought (70) and oversold (30) reference levels.
4. **Time Range Selectors:**
   - Dedicated pills: `1W`, `1M`, `3M`, `6M`, `1Y`, `ALL`.
5. **Real-Time Hover Tooltip:**
   - Displays Open, High, Low, Close, Daily Change, Change %, Volume, and Date directly in the header toolbar during crosshair movement.
6. **Responsive Auto-Resize:**
   - Utilizes `ResizeObserver` for smooth, flicker-free canvas resizing across all viewport dimensions.

---

## 4. 3D Global Telemetry Integration (`GlobalMarketGlobe3D.tsx`)

Integrated into the **Stock Research** view as an interactive visual anchor:

- **Implementation:** Built using Three.js with WebGL low-power preference.
- **Elements:**
  - 3D dotted emerald sphere representing the globe.
  - Inner geometric wireframe.
  - Pulsing markers for primary global financial hubs: New York (XNYS/XNGS), London (XLON), Tokyo (XJPX), Zurich (XSWX), Singapore (XSES), and Frankfurt (XFRA).
  - Animated quadratic bezier arcs representing international capital and liquidity routing.
  - Interactive mouse rotation and drag controls.
- **Safety & Accessibility:**
  - Automatically queries `prefers-reduced-motion: reduce` and provides a clean 2D HTML/CSS fallback if active.
  - Detects WebGL capability and falls back gracefully on non-accelerated devices.
  - Full resource disposal (`dispose()`) on unmount to guarantee zero memory leaks.

---

## 5. View-by-View Synchronization

Every view in the application has been updated to dynamically synchronize with the active instrument:

1. **AI Assistant (`ChatWorkspace.tsx`):**
   - Context-aware: remembers the currently selected ticker if the user omits the symbol in follow-up questions.
   - Renders interactive inline quote cards, fundamental valuation tables, news feeds, and candlestick charts.
2. **Stock Research (`MarketResearch.tsx`):**
   - Receives `selectedSymbol` and immediately loads 3-statement financials and audited SEC EDGAR XBRL ratios.
   - Displays 3D Global Telemetry banner at the top.
3. **Technical Studio (`TechnicalStudio.tsx`):**
   - Synchronizes with `selectedSymbol` and renders the upgraded TradingView candlestick canvas with indicator cards.
4. **News & Sentiment (`NewsTerminal.tsx`):**
   - Automatically loads news headlines and financial lexicon polarity for the selected symbol.
5. **Task Workers (`JobsMonitor.tsx`):**
   - Automatically populates the selected symbol for async research memo compilation.
