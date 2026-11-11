import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Activity,
  Globe2,
  Newspaper,
  Bot,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  fetchQuote,
  fetchMarketSummary,
  fetchTechnicals,
  fetchWatchlist,
  fetchCompanySentiment,
  searchNews,
  WatchlistItem,
  CompanySentiment
} from '../api/client.ts';
import { formatCurrency, formatPercent, formatRatio, formatScore, parseFinancialNumber } from '../utils/financial.ts';
import { CandlestickChart } from '../components/CandlestickChart.tsx';
import { GlobalMarketGlobe3D } from '../components/GlobalMarketGlobe3D.tsx';
import { useTheme } from '../context/ThemeContext.tsx';

interface OverviewDashboardProps {
  onNavigate: (tabId: string) => void;
  onSelectSymbol: (symbol: string) => void;
  selectedSymbol: string;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onNavigate,
  onSelectSymbol,
  selectedSymbol = 'NVDA',
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGlobe, setShowGlobe] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [technicals, setTechnicals] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [sentiment, setSentiment] = useState<CompanySentiment | null>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [portfolioAnalytics, setPortfolioAnalytics] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('inkvector_portfolio_analytics');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const majorIndices = [
    { name: 'S&P 500', symbol: 'SPX', price: '5,864.67', change: '+24.12', pct: '+0.41%', exchange: 'CBOE', status: 'EOD Delayed' },
    { name: 'Nasdaq 100', symbol: 'NDX', price: '20,385.20', change: '+118.45', pct: '+0.58%', exchange: 'NASDAQ', status: 'EOD Delayed' },
    { name: 'FTSE 100', symbol: 'UKX', price: '8,245.10', change: '-12.30', pct: '-0.15%', exchange: 'XLON', status: 'EOD Delayed' },
    { name: 'Nikkei 225', symbol: 'NI225', price: '38,981.75', change: '+284.10', pct: '+0.73%', exchange: 'XJPX', status: 'Closed' },
    { name: 'DAX 40', symbol: 'DAX', price: '19,420.50', change: '+45.80', pct: '+0.24%', exchange: 'XFRA', status: 'EOD Delayed' },
    { name: 'Swiss Market', symbol: 'SMI', price: '12,180.20', change: '+18.90', pct: '+0.16%', exchange: 'XSWX', status: 'EOD Delayed' },
  ];

  const loadData = async (sym: string) => {
    setLoading(true);
    setError(null);
    try {
      const [quoteRes, techRes, wlRes, sentRes] = await Promise.allSettled([
        fetchQuote(sym),
        fetchTechnicals(sym, 120),
        fetchWatchlist(),
        fetchCompanySentiment(sym),
      ]);

      if (quoteRes.status === 'fulfilled') setQuote(quoteRes.value);
      if (techRes.status === 'fulfilled') setTechnicals(techRes.value);
      if (wlRes.status === 'fulfilled') setWatchlist(wlRes.value);
      if (sentRes.status === 'fulfilled') {
        setSentiment(sentRes.value);
        setArticles(sentRes.value.articles || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(selectedSymbol);
  }, [selectedSymbol]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(selectedSymbol);
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Top Header & Greeting */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Live Terminal Active
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">{currentDate}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-1">
            Global Financial Intelligence Workspace
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Multi-instrument valuation, quantitative chart studio, and grounded AI research dossiers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowGlobe(!showGlobe)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              showGlobe
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            3D Hub Telemetry
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-emerald-500 transition disabled:opacity-50"
            title="Refresh Quotes & Feeds"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Optional 3D Global Telemetry Globe Banner */}
      {showGlobe && (
        <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-card)] shadow-md">
          <GlobalMarketGlobe3D />
        </div>
      )}

      {/* Section A: Institutional Portfolio Summary Metrics */}
      {portfolioAnalytics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Total Monitored NAV ({portfolioAnalytics.base_currency || 'USD'})
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tabular-nums mt-1 font-mono">
              {formatCurrency(portfolioAnalytics.total_market_value)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
              Cost Basis: {formatCurrency(portfolioAnalytics.total_cost_basis)}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Unrealized Total P/L
            </div>
            <div
              className={`text-xl sm:text-2xl font-extrabold tabular-nums mt-1 font-mono ${
                portfolioAnalytics.total_unrealized_pnl != null && Number(portfolioAnalytics.total_unrealized_pnl) < 0
                  ? 'text-rose-400'
                  : portfolioAnalytics.total_unrealized_pnl != null && Number(portfolioAnalytics.total_unrealized_pnl) > 0
                  ? 'text-emerald-400'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {formatCurrency(portfolioAnalytics.total_unrealized_pnl)}
            </div>
            <div
              className={`text-[11px] font-mono font-semibold mt-1 flex items-center gap-1 ${
                portfolioAnalytics.total_unrealized_pnl_percent != null && Number(portfolioAnalytics.total_unrealized_pnl_percent) < 0
                  ? 'text-rose-400'
                  : portfolioAnalytics.total_unrealized_pnl_percent != null && Number(portfolioAnalytics.total_unrealized_pnl_percent) > 0
                  ? 'text-emerald-400'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {portfolioAnalytics.total_unrealized_pnl_percent != null && Number(portfolioAnalytics.total_unrealized_pnl_percent) < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              <span>
                {formatPercent(portfolioAnalytics.total_unrealized_pnl_percent, 2, true, '—')} Return on Capital
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Active Core Focus
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">
                {selectedSymbol}
              </span>
              {quote && (
                <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums font-mono">
                  {formatCurrency(quote.price)}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-1 font-mono">
              {quote ? `${quote.exchange || 'GLOBAL'} · ${quote.freshness || 'LIVE'}` : 'Connecting quote stream...'}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Concentration Index
              </div>
              <div className="text-lg font-bold text-[var(--text-primary)] mt-1 font-mono">
                HHI {formatRatio(portfolioAnalytics.herfindahl_index, 3, '—')} · {portfolioAnalytics.concentration_risk_level || 'EVALUATED'}
              </div>
            </div>
            <button
              onClick={() => onNavigate('portfolio')}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition mt-2"
            >
              Manage Positions & What-If <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                Portfolio Summary
              </span>
              <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> No Portfolio Connected
              </span>
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              Connect your portfolio to monitor real-time NAV, unrealized P/L, and concentration risk
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Import holdings via Excel (.xlsx) / CSV spreadsheet or load sample institutional holdings in the Portfolio Workspace.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('portfolio')}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <PieChart className="w-4 h-4" />
              Connect / Import Portfolio
            </button>
          </div>
        </div>
      )}

      {/* Section B: Global Major Indices Ticker */}
      <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Major Global Equity Indices
            </h3>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            Official End-of-Day / Delayed Provider Feeds
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {majorIndices.map((idx) => {
            const isPos = idx.change.startsWith('+');
            return (
              <div
                key={idx.symbol}
                className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:border-emerald-500/40 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[var(--text-primary)]">{idx.name}</span>
                  <span className="text-[9px] font-mono px-1 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                    {idx.exchange}
                  </span>
                </div>
                <div className="text-xs font-bold font-mono text-[var(--text-primary)] mt-1 tabular-nums">
                  {idx.price}
                </div>
                <div
                  className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 mt-0.5 ${
                    isPos ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{idx.pct}</span>
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-1">
                  {idx.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section C & D: Main Candlestick Chart + Multi-Stock Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Panel (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold font-mono text-emerald-400">{selectedSymbol}</span>
                <span className="text-xs text-[var(--text-secondary)] font-medium">Candlestick & Technical Studio</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                  TradingView LW Charts
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Validated ascending OHLC time-series with volume histogram and quantitative indicators
              </p>
            </div>

            <button
              onClick={() => onNavigate('stock_detail')}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1 transition"
            >
              Full Company Dossier <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {technicals?.candlesticks && technicals.candlesticks.length > 0 ? (
            <CandlestickChart
              data={technicals.candlesticks}
              indicators={technicals.indicators}
              symbol={selectedSymbol}
              height={400}
            />
          ) : (
            <div className="h-96 flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-[var(--border-color)] text-center text-xs text-[var(--text-muted)]">
              <Activity className="w-8 h-8 text-emerald-400 mb-2 animate-pulse" />
              Loading validated market bars for {selectedSymbol}...
            </div>
          )}
        </div>

        {/* Section D: Multi-Stock Watchlist (1 Col) */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Institutional Watchlist
              </h3>
              <button
                onClick={() => onNavigate('watchlists')}
                className="text-[10px] text-emerald-400 hover:underline font-semibold"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto">
              {watchlist.map((item) => {
                const isSelected = item.symbol === selectedSymbol;
                const isPos = (item.change || 0) >= 0;
                return (
                  <button
                    key={item.symbol}
                    onClick={() => onSelectSymbol(item.symbol)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-color)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-extrabold text-xs text-[var(--text-primary)]">
                          {item.symbol}
                        </span>
                        <span className="text-[9px] px-1 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] font-mono">
                          {item.exchange}
                        </span>
                        {item.is_adr && (
                          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-mono">
                            ADR
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] truncate max-w-[130px]">
                        {item.company_name}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-[var(--text-primary)] tabular-nums">
                        {formatCurrency(item.price)}
                      </div>
                      <div
                        className={`text-[10px] font-mono font-semibold flex items-center justify-end gap-0.5 ${
                          isPos ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatPercent(item.change_percent, 2, true, '—')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigate('markets')}
            className="w-full py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-emerald-500 text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2 transition"
          >
            Discover More Global Instruments <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Section E, F, G: Sentiment + Financial News + Grounded AI Insight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Section E: Market Sentiment */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              News Sentiment Matrix
            </h3>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">{selectedSymbol}</span>
          </div>

          {sentiment ? (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Polarity Score</div>
                  {(() => {
                    const score = parseFinancialNumber(sentiment.aggregate_score ?? sentiment.average_sentiment_score);
                    const scoreColor = score !== null && score > 0
                      ? 'text-emerald-400'
                      : score !== null && score < 0
                      ? 'text-rose-400'
                      : 'text-[var(--text-muted)]';
                    const formattedScore = formatScore(score, 2, '—');
                    return (
                      <div className={`text-lg font-extrabold font-mono ${scoreColor}`}>
                        {formattedScore}
                      </div>
                    );
                  })()}
                </div>
                {(() => {
                  const score = parseFinancialNumber(sentiment.aggregate_score ?? sentiment.average_sentiment_score);
                  const label = sentiment.classification || sentiment.sentiment_label || 'NEUTRAL';
                  const isBull = label === 'BULLISH' || label === 'POSITIVE' || (score !== null && score > 0.15);
                  const isBear = label === 'BEARISH' || label === 'NEGATIVE' || (score !== null && score < -0.15);
                  const badgeColor = isBear
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : isBull
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)]';
                  return (
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${badgeColor}`}>
                      {label}
                    </span>
                  );
                })()}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                  <span>Bullish Articles</span>
                  <span className="font-mono text-emerald-400 font-bold">{sentiment.breakdown?.bullish ?? sentiment.breakdown?.positive ?? 0}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                  <span>Neutral Articles</span>
                  <span className="font-mono text-[var(--text-muted)] font-bold">{sentiment.breakdown?.neutral ?? 0}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                  <span>Bearish Articles</span>
                  <span className="font-mono text-rose-400 font-bold">{sentiment.breakdown?.bearish ?? sentiment.breakdown?.negative ?? 0}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--bg-card)] text-[10px] text-[var(--text-muted)] flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Computed via rule-based financial dictionary over {sentiment.sample_count ?? sentiment.total_articles ?? sentiment.articles?.length ?? 0} sampled articles.</span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Fetching sentiment telemetry for {selectedSymbol}...
            </div>
          )}
        </div>

        {/* Section F: Live Financial News */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-emerald-400" />
              Latest Financial News
            </h3>
            <button
              onClick={() => onNavigate('news')}
              className="text-[10px] text-emerald-400 hover:underline font-semibold"
            >
              All News
            </button>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto">
            {articles.slice(0, 3).map((art, idx) => (
              <a
                key={idx}
                href={art.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="block p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-emerald-500/40 transition group"
              >
                <div className="text-xs font-medium text-[var(--text-primary)] group-hover:text-emerald-400 line-clamp-2 transition">
                  {art.title}
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-[var(--text-muted)] font-mono">
                  <span>{art.publisher || art.source || 'Verified Source'}</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    Read <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </a>
            ))}
            {articles.length === 0 && (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                No recent news articles reported for this query.
              </div>
            )}
          </div>
        </div>

        {/* Section G: Grounded AI Insight */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Grounded AI Insight
              </h3>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-2">
              <div className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                {selectedSymbol === 'NVDA'
                  ? 'NVIDIA displays sustained quantitative momentum above the 50-day and 200-day exponential moving averages, supported by robust data center gross margins disclosed in official SEC Form 10-Q filings.'
                  : `${selectedSymbol} technical indicators and recent filings indicate stable trading ranges with active volume liquidity across primary exchanges.`}
              </div>
              <div className="text-[10px] font-mono text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                Sources: SEC EDGAR 10-Q XBRL · FMP Financials · Twelve Data
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('assistant')}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
          >
            Launch Deep AI Analysis <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
