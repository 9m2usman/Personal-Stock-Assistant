# INKVECTOR — TECHNOLOGY AND ARCHITECTURAL DECISIONS

## 1. Core Framework Decisions

### React 19 + TypeScript + Vite
- **Choice**: Modern React 19 functional components with TypeScript strict checking and Vite 6 build pipeline.
- **Rationale**: Provides instant Hot Module Replacement (HMR) for rapid UI iteration, rock-solid typing across API payloads, and clean, tree-shaken production bundles under 1.5MB gzip.

### Tailwind CSS 4.0
- **Choice**: Tailwind CSS v4 using the native `@tailwindcss/vite` plugin.
- **Rationale**: Minimal build overhead, instant CSS compilation, and clean CSS custom property overrides for seamless Dark Fintech and Light Studio switching.

---

## 2. Financial Charting Foundation

### TradingView Lightweight Charts (v4.2.1)
- **Choice**: TradingView `lightweight-charts`.
- **Evaluated Alternatives**: Chart.js, Recharts, Highcharts, CanvasJS.
- **Rationale**:
  - The gold standard for financial OHLC candlestick rendering.
  - Native WebGL/Canvas rendering capable of scrolling and zooming 10,000+ data points smoothly at 60 FPS.
  - Zero heavy DOM overhead compared to SVG-based chart engines.
  - Clean API for multi-series layering (Candlesticks, Volume bars, SMA lines, RSI indicators).
  - Stable React lifecycle wrapper preventing canvas recreation on component re-render.

### Recharts (v2.15.1)
- **Choice**: Recharts for analytical visualizations (asset allocation pie charts, peer comparison bar charts).
- **Rationale**: SVG precision, declarative React API, and responsive flex container support.

---

## 3. 3D Visualization Foundation

### Three.js (v0.187.0)
- **Choice**: Direct Three.js WebGL canvas integration with hardware acceleration.
- **Evaluated Alternatives**: React Three Fiber (R3F) + Drei.
- **Rationale**:
  - Direct Three.js gives absolute control over renderer lifecycle, pixel ratio scaling, memory disposal, and low-power rendering preferences.
  - Avoids React 19 peer dependency conflicts frequently found in third-party R3F ecosystem wrappers.
  - Clean fallback mechanism for machines without active WebGL hardware or where `prefers-reduced-motion` is enabled.

---

## 4. State Management & Navigation Architecture

### React Context + Local Storage Persistence
- **Choice**: Custom `ThemeContext` and React state with local storage synchronization.
- **Rationale**: Lightweight, zero external bundle bloat, zero unnecessary Redux/Zustand boilerplate for a fast, responsive terminal interface.
- **Persistence Scope**:
  - Active theme (`dark` / `light`).
  - Base currency preference (`USD`, `EUR`, `GBP`, `JPY`, `CHF`).
  - User session credentials & terminal access tier.
  - Onboarding completion flag.

---

## 5. Security & Secret Governance

- **API Secrets**: All market provider API keys (Alpha Vantage, Twelve Data, FMP, NewsAPI) remain strictly contained in server-side `.env` files.
- **CORS Protection**: FastAPI endpoints enforce CORS constraints.
- **Sandboxed Computations**: Custom financial scripts submitted in the Analysis Lab are executed within isolated OS subprocesses with strict execution timeouts (5.0s max) and process resource limits.
