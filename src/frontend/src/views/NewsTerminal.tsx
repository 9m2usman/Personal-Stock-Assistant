import React, { useState, useEffect } from 'react';
import { Newspaper, Search, ExternalLink, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { fetchCompanySentiment } from '../api/client.ts';
import { MetricCard } from '../components/MetricCard.tsx';

interface NewsTerminalProps {
  initialSymbol?: string;
}

export const NewsTerminal: React.FC<NewsTerminalProps> = ({ initialSymbol = 'NVDA' }) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [query, setQuery] = useState(initialSymbol);
  const [sentiment, setSentiment] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSymbol && initialSymbol !== symbol) {
      setSymbol(initialSymbol);
      setQuery(initialSymbol);
    }
  }, [initialSymbol]);

  useEffect(() => {
    loadSentiment(symbol);
  }, [symbol]);

  const loadSentiment = async (sym: string) => {
    setLoading(true);
    try {
      const res = await fetchCompanySentiment(sym);
      setSentiment(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSymbol(query.trim().toUpperCase());
    }
  };

  const breakdown = sentiment?.breakdown || { positive: 0, neutral: 0, negative: 0 };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-emerald-400" />
            Financial News & Sentiment Intelligence Terminal
          </h1>
          <p className="text-xs text-slate-400">Real-time NewsAPI feed with institutional lexicon sentiment classification</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="Search symbol (e.g. NVDA, TSLA)..."
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-52"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition"
          >
            Scan News
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm">
          Scanning financial headlines and deriving polarity scores for {symbol}...
        </div>
      )}

      {!loading && sentiment && (
        <div className="space-y-6">
          {/* Sentiment Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Overall Sentiment"
              value={sentiment.sentiment_label}
              subtitle={`Score: ${sentiment.average_sentiment_score}`}
              icon={<ThumbsUp className="w-4 h-4" />}
            />
            <MetricCard
              title="Positive Articles"
              value={breakdown.positive}
              subtitle="Bullish Catalysts"
            />
            <MetricCard
              title="Neutral Articles"
              value={breakdown.neutral}
              subtitle="Market Reports"
            />
            <MetricCard
              title="Negative Articles"
              value={breakdown.negative}
              subtitle="Bearish Risks"
            />
          </div>

          {/* Headline Articles Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Verified Media Articles ({sentiment.total_articles})
            </h3>

            <div className="space-y-3">
              {sentiment.articles?.map((article: any, idx: number) => {
                const label = article.sentiment_label || 'NEUTRAL';
                return (
                  <a
                    key={idx}
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block p-4 bg-slate-950/70 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700 rounded-xl transition shadow-sm group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400">{article.source}</span>
                        <span>•</span>
                        <span className="text-[11px]">{new Date(article.published_at).toLocaleDateString()}</span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          label === 'POSITIVE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : label === 'NEGATIVE'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {label}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition flex items-center justify-between">
                      <span>{article.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition shrink-0 ml-2" />
                    </div>

                    {article.summary && (
                      <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {article.summary}
                      </p>
                    )}
                  </a>
                );
              })}

              {(!sentiment.articles || sentiment.articles.length === 0) && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No recent articles found for {symbol}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
