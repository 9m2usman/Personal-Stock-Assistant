# INKVECTOR — UI/UX DESIGN SYSTEM SPECIFICATION

## 1. Visual Identity & Brand Philosophy

INKVECTOR is an institutional AI financial intelligence terminal combining the information density of modern financial analytics (TradingView, Koyfin, Bloomberg) with the sleek responsiveness of modern productivity platforms (Linear, Stripe).

### Key Design Pillars
- **Trustworthy Precision**: Numeric clarity with tabular figures (`font-variant-numeric: tabular-nums`), clear metric badges, and explicit data freshness timestamps.
- **Purposeful Immersion**: 3D spatial models in Three.js that represent real market topologies and AI inference cycles rather than gratuitous decorations.
- **Adaptive Contrast**: Native support for Dark Fintech mode and Light Studio mode via semantic CSS variables.
- **Zero Fiction**: Financial figures, currency exchange rates, and financial statements are strictly anchored in authenticated backend data.

---

## 2. Color System & Design Tokens

Design tokens are implemented via CSS custom properties in `src/frontend/src/index.css` and dynamically applied through `ThemeContext.tsx`.

### 2.1 Dark Theme (Fintech Terminal)
```css
:root {
  --bg-main: #0B1016;         /* Main application background */
  --bg-secondary: #111922;    /* Sidebar & header surfaces */
  --bg-elevated: #17212C;     /* Dropdowns, controls, input containers */
  --bg-card: #151F29;         /* Content panels & tables */
  --text-primary: #F0F4F8;    /* High-contrast headings and active metrics */
  --text-secondary: #96A4B3;  /* Subtitles, labels, descriptions */
  --text-muted: #687789;      /* Metadata, timestamps, shortcuts */
  --border-color: #263442;    /* Structural borders */
  --border-subtle: #1C2733;   /* Table row dividers */
  --accent-primary: #20C997;  /* INKVECTOR emerald accent */
  --accent-hover: #1DB889;    /* Button hover state */
  --color-positive: #22C98A;  /* Gains, bullish sentiment */
  --color-negative: #F06B73;  /* Losses, bearish sentiment */
  --color-warning: #E9B85C;   /* Moderate concentration, pending tasks */
  --color-info: #69A8F5;      /* General info, links */
}
```

### 2.2 Light Theme (Analytical Studio)
```css
.light {
  --bg-main: #F4F7FA;         /* Clean off-white background */
  --bg-secondary: #FFFFFF;    /* Crisp white structural headers */
  --bg-elevated: #FFFFFF;     /* Elevated dialogs */
  --bg-card: #FFFFFF;         /* Content cards */
  --text-primary: #182330;    /* Charcoal primary headings */
  --text-secondary: #617184;  /* Muted dark labels */
  --text-muted: #8997A7;      /* Neutral gray metadata */
  --border-color: #E1E8EF;    /* Soft borders */
  --border-subtle: #EDF2F7;   /* Row dividers */
  --accent-primary: #078C69;  /* Deep institutional emerald */
  --accent-hover: #067356;    /* Active button emerald */
  --color-positive: #078C69;  /* Green gains */
  --color-negative: #D94D5C;  /* Crimson losses */
  --color-warning: #A97822;   /* Amber warning */
  --color-info: #3978C6;      /* Blue links */
}
```

---

## 3. Typography Scale & Tabular Hierarchy

- **Font Family**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Monospace Family**: System monospace (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`) for all ticker symbols, currency codes, prices, percentages, and timestamps.
- **Numeric Alignment**: Mandatory `.tabular-nums` applied to financial tables and cards to ensure vertical digit alignment during value updates.

### Type Scale
- **Display Figures**: `text-2xl` to `text-3xl` font-extrabold (`$142,850.00`)
- **Section Headings**: `text-base` to `text-xl` font-bold
- **Sub-headings & Card Titles**: `text-xs` font-bold uppercase tracking-wider
- **Body Text**: `text-xs` leading-relaxed
- **Captions & Metadata**: `text-[10px]` to `text-[11px]` font-mono

---

## 4. Spacing Scale & Corner Radii

- **Spacing Scale**: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px
- **Corner Radii**:
  - Small Controls (Badges, Buttons): `rounded-lg` (8px)
  - Cards & Panels: `rounded-xl` (12px)
  - Main Sections & Modals: `rounded-2xl` (16px)

---

## 5. Component Library Standards

1. **Application Shell (`AppShell.tsx`)**:
   - Collapsible 2-state sidebar (expanded 256px, collapsed 80px) with animated tooltips.
   - Breadcrumb navigation, persistent search, and quick ticker bar.
2. **Command Palette (`CommandPalette.tsx`)**:
   - `Ctrl+K` global keyboard shortcut.
   - Instant search across all 13 screens, registered stock instruments, and system actions.
3. **Candlestick Chart Studio (`CandlestickChart.tsx`)**:
   - High-performance TradingView Lightweight Charts canvas.
   - Multi-timeframe switching (1W, 1M, 3M, 6M, 1Y, ALL).
   - Dynamic indicators (SMA 50, SMA 200, RSI 14 oscillator, MACD, Volume).
4. **Three.js 3D Visuals**:
   - `GlobalMarketGlobe3D.tsx`: Financial hub globe with real-time status (NYC, LON, TYO, ZRH, FRA, SGX).
   - `AiNetwork3D.tsx`: Interactive neural node mesh reacting to AI execution states.
   - `AuthVisual3D.tsx`: Geometric glass forms with ambient emerald lighting.
