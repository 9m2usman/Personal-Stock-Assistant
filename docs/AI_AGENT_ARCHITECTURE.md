# INKVECTOR — Institutional Financial AI Agent Architecture

## 1. High-Level Architecture

The INKVECTOR Financial AI Assistant is an autonomous conversational agent engineered for hedge-fund level financial analysis. Unlike generic chatbots, the INKVECTOR AI Agent operates inside a deterministic **Tool-Augmented Reasoning Loop** governed by strict security policies, zero-hallucination mathematical verification, and sandbox computational isolation.

```
[User Chat Prompt]
         │
         ▼
[Intent Classifier & Entity Extractor] ──> Detects Intent (STOCK_COMPARISON, SCENARIO_SIMULATION, etc.)
         │
         ▼
[Policy Engine Validation] ──> Verifies user authorization & tool safety boundaries
         │
         ▼
[Financial AI Orchestrator] ──> Dispatches typed tool executions to Registry
         │
   ┌─────┴──────────────────────────────┐
   ▼                                    ▼
[Multi-Provider Engine]     [Portfolio Scenario Engine]
(Quotes, SEC Facts, News)   (Buy/Sell Simulation, HHI Delta)
   │                                    │
   └─────┬──────────────────────────────┘
         ▼
[Institutional Response Synthesizer]
         │
         ├─► Markdown Tables & Decision Support Insights
         ├─► Interactive UI Widgets (Comparison Matrix, Simulation Receipt)
         └─► Explicit Citations & Regulatory Disclosures
```

---

## 2. Intent Classification Subsystem (`src/backend/ai/intent.py`)

The agent harness identifies intent deterministically using domain lexicons, regex token patterns, and entity mapping:

### Supported Financial Intents
1. `STOCK_COMPARISON`: Side-by-side benchmarking of two or more equities (e.g. *"Compare NVIDIA and AMD, which looks more attractive?"*).
2. `SCENARIO_SIMULATION`: Rebalancing and what-if liquidation modeling (e.g. *"If I sell my Tesla holdings and invest 60% in NVIDIA and 40% in AMD"*).
3. `TECHNICAL_ANALYSIS`: Moving averages, RSI, MACD, Bollinger Bands, and realized volatility.
4. `FUNDAMENTAL_ANALYSIS`: P/E, P/B, EV/EBITDA, gross margin, net margin, debt-to-equity, and ROE.
5. `NEWS_SENTIMENT`: Polarity scoring and catalyst identification across verified press feeds.
6. `PORTFOLIO_QUERY`: Concentration risk, Herfindahl index, and asset allocation reviews.
7. `PRICE_CHECK`: Canonical quote retrieval with real-time provenance.

---

## 3. Tool Execution Registry (`src/backend/ai/tools/registry.py`)

All actions executed by the agent are encapsulated in typed, schema-validated tools:

| Tool Name | Purpose | Output Format |
| :--- | :--- | :--- |
| `compare_stocks` | Gathers quotes, fundamentals, technicals, and news for 2 equities concurrently | JSON Comparison Object |
| `simulate_portfolio_reallocation` | Mathematical multi-leg buy/sell simulator with HHI concentration delta | Structured Scenario Result |
| `get_realtime_quote` | Fetches normalized equity quote | `NormalizedQuote` |
| `get_fundamentals` | Extracts SEC Form 10-K / 10-Q ratios and profiles | `FundamentalOverview` |
| `get_technical_indicators` | Calculates SMA, EMA, RSI, MACD, Bollinger Bands | `TechnicalIndicators` |
| `get_company_sentiment` | Analyzes article headlines and computes polarity | `CompanySentimentOverview` |
| `execute_python_code` | Runs Python computations in an isolated subprocess sandbox | Sandbox Execution Result |
| `submit_background_analysis` | Dispatches heavy research tasks to native Celery worker | Celery Task ID |

---

## 4. Grounded Synthesis & Zero-Hallucination Policy

1. **No Phantom Multiples:** If a provider does not supply P/E or gross margin for an over-the-counter or foreign instrument, the agent reports `"N/A"` rather than generating an arbitrary figure.
2. **Decision Support Disclosures:** Every comparative recommendation and scenario simulation concludes with an explicit disclaimer:
   > *"Calculations use live market snapshots. This analysis is decision support and does not constitute guaranteed return or financial advice. No actual trade has been placed."*
3. **Dual Delivery (Text + Widgets):** In addition to human-readable Markdown tables, the AI emits structured `UIWidget` payloads that render dedicated interactive widgets in the frontend chat history.
