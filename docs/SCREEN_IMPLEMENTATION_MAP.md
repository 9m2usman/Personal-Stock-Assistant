# INKVECTOR — SCREEN IMPLEMENTATION AND API MAPPING

## 1. Screen Implementation Status

All 13 specified screens and global shell systems have been implemented, connected to verified backend endpoints, and validated.

| Screen ID | Screen Name | Implementation Component | Backend Endpoints | Status |
|---|---|---|---|---|
| Screen 1 | Authentication & Terminal Access | `src/frontend/src/components/AuthModal.tsx` + `AuthVisual3D.tsx` | Local storage token, guest bypass, backend health check | **COMPLETE** |
| Screen 2 | First-Time Onboarding Wizard | `src/frontend/src/components/OnboardingWizard.tsx` | Currency preference, market selection, watchlist seed | **COMPLETE** |
| Screen 3 | Main Dashboard / Overview | `src/frontend/src/views/OverviewDashboard.tsx` | `/api/v1/market/quote`, `/technicals`, `/watchlist`, `/news/sentiment` | **COMPLETE** |
| Screen 4 | Markets & Instrument Discovery | `src/frontend/src/views/MarketsDiscoveryView.tsx` | `/api/v1/market/search`, `/api/v1/market/instruments` | **COMPLETE** |
| Screen 5 | Stock Detail & Company Workspace | `src/frontend/src/views/StockDetailWorkspace.tsx` | `/api/v1/fundamentals/overview`, `/profile`, `/statements`, `/market/technicals` | **COMPLETE** |
| Screen 6 | Watchlists Management | `src/frontend/src/views/WatchlistsWorkspace.tsx` | `/api/v1/market/watchlist`, `/market/search` | **COMPLETE** |
| Screen 7 | Portfolio & Excel Integration | `src/frontend/src/views/PortfolioWorkspace.tsx` | `/api/v1/portfolio/upload-spreadsheet`, `/evaluate`, `/simulate-what-if` | **COMPLETE** |
| Screen 8 | Research & Company Comparison | `src/frontend/src/views/ResearchWorkspace.tsx` | `/api/v1/fundamentals/overview`, `/market/quote` | **COMPLETE** |
| Screen 9 | Financial News & Sentiment | `src/frontend/src/views/NewsSentimentView.tsx` | `/api/v1/news/sentiment`, `/api/v1/news/search` | **COMPLETE** |
| Screen 10 | AI Financial Assistant | `src/frontend/src/views/AiAssistantView.tsx` + `AiNetwork3D.tsx` | `/api/v1/chat/message`, `/api/v1/chat/history` | **COMPLETE** |
| Screen 11 | Analysis Lab (Python & Jobs) | `src/frontend/src/views/AnalysisLabView.tsx` | `/api/v1/sandbox/execute`, `/api/v1/jobs/research`, `/jobs/status/{id}`, `/jobs/health` | **COMPLETE** |
| Screen 12 | Saved Research & Reports | `src/frontend/src/views/SavedResearchView.tsx` | Local persistence + Markdown/JSON export | **COMPLETE** |
| Screen 13 | Settings & Integrations | `src/frontend/src/views/SettingsView.tsx` | `/api/v1/jobs/health`, ThemeContext, Currency persistence | **COMPLETE** |

---

## 2. Global Components & Overlays

1. **Persistent Left Sidebar (`AppShell.tsx`)**:
   - Expanded state (256px) and Collapsed icon state (80px).
   - Grouped sections: Workspace, Intelligence, Preferences.
   - Active route visual indicator and hover transitions.
   - Mobile responsive drawer with toggle trigger.
2. **Global Header & Universal Search (`AppShell.tsx`)**:
   - Universal ticker and company autocomplete dropdown.
   - Keyboard shortcut badge (`Ctrl+K`).
   - Quick theme toggle (Sun/Moon).
   - User profile badge and terminal tier indicator.
3. **Command Palette (`CommandPalette.tsx`)**:
   - Keyboard navigation (`Ctrl+K`, arrows, enter, escape).
   - Fast filtering across all 13 screens and live stocks.
   - Instant system actions (toggle theme, import Excel, stress tests).
4. **Interactive 3D Visualizations**:
   - `GlobalMarketGlobe3D.tsx`: Interactive Three.js financial market hub globe.
   - `AiNetwork3D.tsx`: Three.js neural node mesh with particle streams responding to AI pipeline state.
   - `AuthVisual3D.tsx`: Abstract 3D geometric glass forms with emerald illumination.
5. **Quick Watchlist Drawer (`WatchlistDrawer.tsx`)**:
   - Slide-out quick drawer accessible from any screen.
