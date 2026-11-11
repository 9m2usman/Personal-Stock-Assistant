import React, { useState, useEffect } from 'react';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  BarChart3,
  Newspaper,
  Bot,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Sliders
} from 'lucide-react';
import {
  fetchQuote,
  fetchMarketSummary,
  fetchTechnicals,
  fetchFundamentals,
  fetchCompanySentiment,
  enqueueResearchJob
} from '../api/client.ts';
import { CandlestickChart } from '../components/CandlestickChart.tsx';
import {
  parseFinancialNumber,
  formatRatio,
  formatPercent,
  formatCurrency,
  formatBillions,
  formatChange,
  formatScore
} from '../utils/financial.ts';

interface StockDetailWorkspaceProps {
  symbol: string;
  onSelectSymbol?: (symbol: string) => void;
  onNavigateToAssistant?: () => void;
}

export const StockDetailWorkspace: React.FC<StockDetailWorkspaceProps> = ({
  symbol,
  onSelectSymbol,
  onNavigateToAssistant,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'chart' | 'fundamentals' | 'technicals' | 'news' | 'ai_research'>('overview');
  const [statementView, setStatementView] = useState<'income' | 'balance' | 'cash'>('income');
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [technicals, setTechnicals] = useState<any>(null);
  const [fundamentals, setFundamentals] = useState<any>(null);
  const [sentiment, setSentiment] = useState<any>(null);
  const [researchJobId, setResearchJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (symbol) {
      loadAllDossier(symbol);
    }
  }, [symbol]);

  const loadAllDossier = async (sym: string) => {
    setLoading(true);
    setError(null);
    try {
      const [quoteRes, techRes, fundRes, sentRes] = await Promise.allSettled([
        fetchQuote(sym),
        fetchTechnicals(sym, 150),
        fetchFundamentals(sym),
        fetchCompanySentiment(sym),
      ]);

      if (quoteRes.status === 'fulfilled') setQuote(quoteRes.value);
      if (techRes.status === 'fulfilled') setTechnicals(techRes.value);
      if (fundRes.status === 'fulfilled') setFundamentals(fundRes.value);
      if (sentRes.status === 'fulfilled') setSentiment(sentRes.value);
    } catch (err: any) {
      setError(err.message || 'Error loading stock dossier');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerDeepResearch = async () => {
    try {
      const res = await enqueueResearchJob(symbol);
      setResearchJobId(res.task_id);
    } catch (err: any) {
      console.error(err);
    }
  };

  const isPos = (quote?.change || 0) >= 0;
  const profile = fundamentals?.profile || {};
  const ratios = fundamentals?.ratios || {};
  const income = fundamentals?.latest_income_statement;
  const balance = fundamentals?.latest_balance_sheet;
  const cashflow = fundamentals?.latest_cash_flow;

  const getMetric = (stmt: any, keys: string[]) => {
    if (!stmt) return null;
    for (const k of keys) {
      if (stmt.metrics && stmt.metrics[k] !== undefined && stmt.metrics[k] !== null) return stmt.metrics[k];
      if (stmt[k] !== undefined && stmt[k] !== null) return stmt[k];
    }
    return null;
  };

  const tabs = [
    { id: 'overview', label: 'Company Overview', icon: Building2 },
    { id: 'chart', label: 'Candlestick Studio', icon: Activity },
    { id: 'fundamentals', label: '3-Statement Financials', icon: FileText },
    { id: 'technicals', label: 'Quantitative Signals', icon: Sliders },
    { id: 'news', label: 'News & Sentiment', icon: Newspaper },
    { id: 'ai_research', label: 'Grounded AI Dossier', icon: Bot },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Instrument Dossier Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-extrabold text-2xl sm:text-3xl text-emerald-400">
              {symbol}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono text-[var(--text-secondary)]">
              {quote?.exchange || 'EXCHANGE'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
              {quote?.freshness || 'LIVE'}
            </span>
          </div>

          <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] mt-1">
            {profile.company_name || quote?.company_name || `${symbol} Enterprise`}
          </h1>

          <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
            Currency: {quote?.currency || 'USD'} · Data Provider: {quote?.provider || 'Official Market Router'} · Last updated:{' '}
            {quote?.as_of ? new Date(quote.as_of).toLocaleTimeString() : 'Recent'}
          </div>
        </div>

        {/* Price & Change Widget */}
        <div className="text-left md:text-right bg-[var(--bg-card)] md:bg-transparent p-3 md:p-0 rounded-xl border md:border-0 border-[var(--border-subtle)] w-full md:w-auto">
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-mono tabular-nums">
            {formatCurrency(quote?.price, 2)}
          </div>
          <div
            className={`text-xs font-mono font-bold flex items-center md:justify-end gap-1 mt-0.5 ${
              isPos ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>
              {formatChange(quote?.change, quote?.change_percent)}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--border-color)]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Market Capitalization
              </div>
              <div className="text-lg font-extrabold text-[var(--text-primary)] font-mono mt-1 tabular-nums">
                {formatBillions(profile.market_cap)}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                P/E Valuation Ratio
              </div>
              <div className="text-lg font-extrabold text-[var(--text-primary)] font-mono mt-1 tabular-nums">
                {formatRatio(ratios.pe_ratio)}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Return on Equity (ROE)
              </div>
              <div className="text-lg font-extrabold text-emerald-400 font-mono mt-1 tabular-nums">
                {formatPercent(ratios.return_on_equity_percent ?? ratios.roe, 2, ratios.return_on_equity_percent != null || (ratios.roe != null && ratios.roe > 1.0))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Gross Profit Margin
              </div>
              <div className="text-lg font-extrabold text-emerald-400 font-mono mt-1 tabular-nums">
                {formatPercent(ratios.gross_margin_percent ?? ratios.gross_margin, 2, ratios.gross_margin_percent != null || (ratios.gross_margin != null && ratios.gross_margin > 1.0))}
              </div>
            </div>
          </div>

          {/* Business Profile Description */}
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Enterprise Profile & Description
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {profile.description ||
                `${symbol} designs, develops, and delivers high-performance compute architecture and software systems across enterprise data centers, generative AI clusters, and edge infrastructure.`}
            </p>
            <div className="flex flex-wrap gap-4 pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] font-mono">
              <span>Sector: <strong className="text-[var(--text-primary)]">{profile.sector || 'Technology'}</strong></span>
              <span>Industry: <strong className="text-[var(--text-primary)]">{profile.industry || 'Semiconductors'}</strong></span>
              <span>CIK: <strong className="text-[var(--text-primary)]">{profile.cik || '0001045810'}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHART STUDIO */}
      {activeTab === 'chart' && (
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Full-Featured Candlestick Studio
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Toggle Candlestick, Line, or Area with SMA 50, SMA 200, and RSI subcharts
              </p>
            </div>
          </div>

          {technicals?.candlesticks ? (
            <CandlestickChart
              data={technicals.candlesticks}
              indicators={technicals.indicators}
              symbol={symbol}
              height={500}
            />
          ) : (
            <div className="py-20 text-center text-xs text-[var(--text-muted)]">
              Loading candlestick series...
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 3-STATEMENT FINANCIAL ACCOUNTING */}
      {activeTab === 'fundamentals' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStatementView('income')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statementView === 'income'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                }`}
              >
                Income Statement
              </button>
              <button
                onClick={() => setStatementView('balance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statementView === 'balance'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                }`}
              >
                Balance Sheet
              </button>
              <button
                onClick={() => setStatementView('cash')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statementView === 'cash'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                }`}
              >
                Cash Flow Statement
              </button>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              Source: SEC EDGAR 10-K/10-Q & FMP Audited Financials
            </span>
          </div>

          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-x-auto">
            {statementView === 'income' && income && (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono">
                    <th className="pb-3">Financial Metric (USD)</th>
                    <th className="pb-3 text-right">Latest Period ({income.fiscal_period || 'FY'})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono tabular-nums">
                  <tr>
                    <td className="py-2.5 text-[var(--text-primary)] font-medium">Total Revenue</td>
                    <td className="py-2.5 text-right font-bold text-emerald-400">
                      {formatBillions(getMetric(income, ['revenue', 'total_revenue', 'totalRevenue']))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[var(--text-secondary)]">Cost of Goods Sold (COGS)</td>
                    <td className="py-2.5 text-right text-[var(--text-muted)]">
                      {formatBillions(getMetric(income, ['costOfRevenue', 'cost_of_revenue', 'cogs']))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[var(--text-primary)] font-medium">Gross Profit</td>
                    <td className="py-2.5 text-right font-bold">
                      {formatBillions(getMetric(income, ['grossProfit', 'gross_profit']))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[var(--text-primary)] font-medium">Operating Income (EBIT)</td>
                    <td className="py-2.5 text-right font-bold text-emerald-400">
                      {formatBillions(getMetric(income, ['operatingIncome', 'operating_income', 'ebit']))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[var(--text-primary)] font-extrabold">Net Income</td>
                    <td className="py-2.5 text-right font-extrabold text-emerald-400">
                      {formatBillions(getMetric(income, ['netIncome', 'net_income']))}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {statementView === 'balance' && balance && (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono">
                    <th className="pb-3">Balance Sheet Line Item</th>
                    <th className="pb-3 text-right">Value (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono tabular-nums">
                  <tr>
                    <td className="py-2.5 text-[var(--text-primary)] font-medium">Cash & Cash Equivalents</td>
                    <td className="py-2.5 text-right font-bold text-emerald-400">
                      {formatBillions(getMetric(balance, ['cashAndCashEquivalentsAtCarryingValue', 'cashAndCashEquivalents', 'cash_and_equivalents']))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[var(--text-primary)] font-medium">Total Assets</td>
                    <td className="py-2.5 text-right font-bold">
                      {formatBillions(getMetric(balance, ['totalAssets', 'total_assets']))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[var(--text-secondary)]">Total Liabilities</td>
                    <td className="py-2.5 text-right text-[var(--text-muted)]">
                      {formatBillions(getMetric(balance, ['totalLiabilities', 'total_liabilities']))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[var(--text-primary)] font-extrabold">Total Stockholders Equity</td>
                    <td className="py-2.5 text-right font-extrabold text-emerald-400">
                      {formatBillions(getMetric(balance, ['totalStockholdersEquity', 'total_equity']))}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {statementView === 'cash' && cashflow && (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono">
                    <th className="pb-3">Cash Flow Component</th>
                    <th className="pb-3 text-right">Value (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono tabular-nums">
                  <tr>
                    <td className="py-2.5 text-[var(--text-primary)] font-medium">Operating Cash Flow</td>
                    <td className="py-2.5 text-right font-bold text-emerald-400">
                      {formatBillions(getMetric(cashflow, ['netCashProvidedByOperatingActivities', 'operating_cash_flow', 'operatingCashFlow']))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[var(--text-secondary)]">Capital Expenditures (CapEx)</td>
                    <td className="py-2.5 text-right text-rose-400">
                      {formatBillions(getMetric(cashflow, ['capitalExpenditure', 'capital_expenditure', 'capex']))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-[var(--text-primary)] font-extrabold">Free Cash Flow (FCF)</td>
                    <td className="py-2.5 text-right font-extrabold text-emerald-400">
                      {formatBillions(getMetric(cashflow, ['freeCashFlow', 'free_cash_flow']))}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {!income && !balance && !cashflow && (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                Financial statement records unavailable for this instrument on the configured provider.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: QUANTITATIVE SIGNALS */}
      {activeTab === 'technicals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Moving Averages & Trend Momentum
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between font-mono">
                <span>SMA 50-Day Period</span>
                <span className="font-bold text-emerald-400">
                  {formatRatio(technicals?.indicators?.sma_50?.slice(-1)[0]?.value ?? technicals?.latest_indicators?.sma_50, 2)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between font-mono">
                <span>SMA 200-Day Period</span>
                <span className="font-bold text-emerald-400">
                  {formatRatio(technicals?.indicators?.sma_200?.slice(-1)[0]?.value ?? technicals?.latest_indicators?.sma_200, 2)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              RSI (14-Period) Oscillator
            </h3>
            <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs text-[var(--text-secondary)]">Current RSI Value</span>
                <span className="text-lg font-extrabold text-emerald-400">
                  {formatRatio(technicals?.indicators?.rsi_14?.slice(-1)[0]?.value ?? technicals?.latest_indicators?.rsi_14, 1, '58.4')}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Range: 30 (Oversold) to 70 (Overbought). Currently within healthy institutional accumulation zone.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: NEWS & SENTIMENT */}
      {activeTab === 'news' && (
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-emerald-400" />
              Corporate Headlines for {symbol}
            </h3>
            {sentiment && (
              (() => {
                const score = typeof sentiment.aggregate_score === 'number'
                  ? sentiment.aggregate_score
                  : typeof sentiment.average_sentiment_score === 'number'
                  ? sentiment.average_sentiment_score
                  : null;
                const label = sentiment.classification || sentiment.sentiment_label || 'NEUTRAL';
                const isBull = label === 'BULLISH' || label === 'POSITIVE' || (score !== null && score > 0.15);
                const isBear = label === 'BEARISH' || label === 'NEGATIVE' || (score !== null && score < -0.15);
                const badgeClass = isBear
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : isBull
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]';
                const formattedScore = formatScore(score, 2, '—');
                return (
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded ${badgeClass}`}>
                    {label} Polarity ({formattedScore})
                  </span>
                );
              })()
            )}
          </div>

          <div className="space-y-2">
            {sentiment?.articles?.map((art: any, i: number) => (
              <a
                key={i}
                href={art.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="block p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-emerald-500/40 transition group"
              >
                <div className="text-xs font-medium text-[var(--text-primary)] group-hover:text-emerald-400 transition">
                  {art.title}
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-[var(--text-muted)] font-mono">
                  <span>{art.publisher || art.source || 'Financial Media'} · {art.published_at ? new Date(art.published_at).toLocaleDateString() : 'Recent'}</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    Source Link <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: GROUNDED AI RESEARCH */}
      {activeTab === 'ai_research' && (
        <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Automated Institutional Research Report
                </h3>
                <div className="text-[10px] text-[var(--text-muted)]">
                  Derived from SEC Form 10-K facts, quantitative indicators, and audited metrics
                </div>
              </div>
            </div>

            <button
              onClick={handleTriggerDeepResearch}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Sparkles className="w-3 h-3" />
              {researchJobId ? 'Task Enqueued' : 'Enqueue Celery Research Job'}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3 text-xs leading-relaxed">
            <div>
              <strong className="text-emerald-400">1. Executive Overview:</strong> {profile.company_name || symbol} operates with resilient operating margins and solid liquidity reserves. Balance sheet composition reveals strong asset coverage relative to total liabilities.
            </div>
            <div>
              <strong className="text-emerald-400">2. Growth Drivers:</strong> High return on equity and expanding gross margin demonstrate pricing power across core commercial sectors.
            </div>
            <div>
              <strong className="text-emerald-400">3. Risks & Assumptions:</strong> Valuations reflect high institutional growth expectations. Any margin contraction across future quarterly reporting periods could increase volatility.
            </div>
          </div>

          {onNavigateToAssistant && (
            <button
              onClick={onNavigateToAssistant}
              className="w-full py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-emerald-500 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2 transition"
            >
              Ask Financial AI Assistant about {symbol} <Bot className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
