# INKVECTOR — Stock Comparison & Multi-Source Sentiment Intelligence

## 1. Overview

The **Stock Comparison & Multi-Source Sentiment Subsystem** provides side-by-side empirical benchmarking across multiple publicly traded companies, integrating three distinct analytical dimensions:
1. **Valuation & Fundamentals:** Multiples (P/E, P/B), profit margins (Gross, Net), and capital efficiency (ROE, Debt-to-Equity).
2. **Quantitative Momentum & Volatility:** 14-day Relative Strength Index (RSI), 50-day Simple Moving Average (SMA), and 252-day annualized realized volatility.
3. **News Sentiment Intelligence:** Press coverage aggregation, sentiment polarity scoring, and catalyst analysis.

---

## 2. Multi-Stock Benchmarking Matrix

When the user requests *"Compare NVIDIA and AMD"* (or any peer set):
1. **Entity Extraction:** Resolves tickers `NVDA` and `AMD` across registered exchange symbology.
2. **Concurrent Data Gathering:** Dispatches parallel asynchronous coroutines using `asyncio.gather` across Twelve Data, FMP, and Alpha Vantage.
3. **Normalized Matrix Construction:** Builds a head-to-head comparison table:

| Category | Metric | Interpretation | Superior Benchmark |
| :--- | :--- | :--- | :--- |
| **Valuation** | P/E Ratio | Price to earnings multiple | Lower multiple indicates lower valuation |
| **Profitability** | Gross Margin (%) | Revenue retained after Cost of Goods Sold | Higher percentage indicates pricing power |
| **Profitability** | Net Margin (%) | Final net income percentage | Higher percentage indicates operational efficiency |
| **Capital Efficiency**| Return on Equity (ROE) | Net income divided by shareholder equity | Higher percentage indicates capital stewardship |
| **Solvency** | Debt-to-Equity | Total debt relative to equity | Lower ratio indicates stronger balance sheet |
| **Momentum** | 14-Day RSI | Technical oscillator (0-100) | 30–70 is neutral; >70 overbought; <30 oversold |
| **Trend** | 50-Day SMA | Medium-term trend line | Price above SMA confirms upward momentum |
| **Risk** | Realized Volatility | 252-trading day price variance | Lower percentage indicates price stability |

---

## 3. Financial Sentiment Analysis Engine (`src/backend/services/news_service.py`)

### 3.1 Lexical Financial Scoring
Articles are ingested from NewsAPI, Alpha Vantage News Sentiment, and curated financial press feeds. The engine evaluates headlines and abstracts against a domain-specific financial lexicon:

- **Positive Lexicon:** `surge`, `rally`, `growth`, `beat`, `bullish`, `record`, `dividend`, `upgrade`, `profit`, `outperform`, `soar`, `gain`, `expansion`, `breakthrough`, `strong`.
- **Negative Lexicon:** `plunge`, `slump`, `miss`, `loss`, `bearish`, `lawsuit`, `downgrade`, `investigation`, `crisis`, `decline`, `fall`, `warning`, `layoffs`, `fine`, `fraud`, `weak`.

### 3.2 Polarity Formula
For article tokens:
$$\text{Score} = \frac{N_{\text{positive}} - N_{\text{negative}}}{N_{\text{positive}} + N_{\text{negative}}}$$

- **Score > +0.15:** `BULLISH` / `POSITIVE`
- **-0.15 ≤ Score ≤ +0.15:** `NEUTRAL`
- **Score < -0.15:** `BEARISH` / `NEGATIVE`

The aggregate score across all analyzed articles is normalized in $[-1.0, +1.0]$ and presented with article counts and publisher citations.
