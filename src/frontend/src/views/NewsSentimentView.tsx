import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  Search,
  Activity,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { fetchCompanySentiment, searchNews, CompanySentiment } from '../api/client.ts';

interface NewsSentimentViewProps {
  initialSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
}

export const NewsSentimentView: React.FC<NewsSentimentViewProps> = ({
  initialSymbol = 'NVDA',
  onSelectSymbol,
}) => {
  const [query, setQuery] = useState(initialSymbol);
  const [sentiment, setSentiment] = useState<CompanySentiment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSentiment(query);
  }, []);

  const loadSentiment = async (sym: string) => {
    if (!sym.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCompanySentiment(sym.trim());
      setSentiment(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch financial news sentiment');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSentiment(query);
  };

  const quickPicks = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'HSBA.L'];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Sentiment Intelligence & NLP
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-emerald-400" />
            Financial News & Market Sentiment Terminal
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Rule-based financial dictionary polarity evaluation over verified global publishers and news wire feeds.
          </p>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Search ticker (e.g. NVDA, AAPL)..."
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shrink-0"
          >
            Scan
          </button>
        </form>
      </div>

      {/* Quick Picks Ticker Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[var(--text-muted)] font-mono">Quick Focus:</span>
        {quickPicks.map((sym) => (
          <button
            key={sym}
            onClick={() => {
              setQuery(sym);
              loadSentiment(sym);
            }}
            className={`px-3 py-1 rounded-lg border font-mono font-semibold transition ${
              query === sym
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-color)]'
            }`}
          >
            {sym}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-20 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
          <span>Scanning verified news publications and computing sentiment polarity...</span>
        </div>
      )}

      {!loading && sentiment && (
        <div className="space-y-6">
          {/* Sentiment Gauge & Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Aggregate Sentiment
              </div>
              {(() => {
                const score = typeof sentiment.aggregate_score === 'number'
                  ? sentiment.aggregate_score
                  : typeof sentiment.average_sentiment_score === 'number'
                  ? sentiment.average_sentiment_score
                  : null;
                const label = sentiment.classification || sentiment.sentiment_label || 'NEUTRAL';
                const isBull = label === 'BULLISH' || label === 'POSITIVE' || (score !== null && score > 0.15);
                const isBear = label === 'BEARISH' || label === 'NEGATIVE' || (score !== null && score < -0.15);
                const textColor = isBear ? 'text-rose-400' : isBull ? 'text-emerald-400' : 'text-[var(--text-secondary)]';
                const formattedScore = score != null ? (score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2)) : '—';
                return (
                  <>
                    <div className={`text-xl sm:text-2xl font-extrabold font-mono mt-1 ${textColor}`}>
                      {label}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                      Polarity Score: {formattedScore}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Bullish Frequency
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono mt-1 tabular-nums">
                {sentiment.breakdown?.bullish ?? sentiment.breakdown?.positive ?? 0} Articles
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Positive catalyst mentions
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Neutral / Balanced
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-secondary)] font-mono mt-1 tabular-nums">
                {sentiment.breakdown?.neutral ?? 0} Articles
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                General corporate reporting
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Bearish Frequency
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-rose-400 font-mono mt-1 tabular-nums">
                {sentiment.breakdown?.bearish ?? sentiment.breakdown?.negative ?? 0} Articles
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Risk & downgrade coverage
              </div>
            </div>
          </div>

          {/* Analysis Methodology Disclaimer */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--text-primary)]">Methodology Disclaimer:</strong> Sentiment scores are computed via Loughran-McDonald institutional financial keyword dictionaries across {sentiment.sample_count ?? sentiment.total_articles ?? sentiment.articles?.length ?? 0} sampled articles. News sentiment reflects current market discussion and should not be construed as a financial price forecast.
            </div>
          </div>

          {/* Articles Feed */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Sampled Financial News Articles ({sentiment.articles?.length || 0})
            </h3>

            <div className="space-y-3">
              {sentiment.articles?.map((art: any, i: number) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-emerald-500/40 transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                      {art.title}
                    </h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      {art.sentiment_label || 'NEUTRAL'}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {art.summary || 'Summary unavailable from provider feed.'}
                  </p>

                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
                    <div className="flex items-center gap-3">
                      <span>Publisher: <strong className="text-[var(--text-primary)]">{art.publisher || art.source || 'Financial Media'}</strong></span>
                      <span>·</span>
                      <span>Published: {art.published_at ? new Date(art.published_at).toLocaleString() : 'Recent'}</span>
                    </div>

                    {art.url && (
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        Read Full Article <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
