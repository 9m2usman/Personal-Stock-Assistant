import React, { useState, useEffect } from 'react';
import { LineChart, Activity, Gauge, TrendingUp, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { fetchTechnicals } from '../api/client.ts';
import { CandlestickChart } from '../components/CandlestickChart.tsx';
import { MetricCard } from '../components/MetricCard.tsx';

interface TechnicalStudioProps {
  initialSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
}

export const TechnicalStudio: React.FC<TechnicalStudioProps> = ({ initialSymbol = 'NVDA', onSelectSymbol }) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [limit, setLimit] = useState(100);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSymbol && initialSymbol !== symbol) {
      setSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  useEffect(() => {
    loadTechnicals(symbol, limit);
  }, [symbol, limit]);

  const loadTechnicals = async (sym: string, barsLimit: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTechnicals(sym, barsLimit);
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to load technical indicators.');
    } finally {
      setLoading(false);
    }
  };

  const latest = data?.latest_indicators || {};
  const rsi = latest.rsi_14;
  const sma50 = latest.sma_50;
  const sma200 = latest.sma_200;

  let rsiSignal = 'NEUTRAL';
  if (rsi !== null && rsi !== undefined) {
    if (rsi >= 70) rsiSignal = 'OVERBOUGHT';
    else if (rsi <= 30) rsiSignal = 'OVERSOLD';
  }

  let trendSignal = 'NEUTRAL';
  if (sma50 && sma200) {
    if (sma50 > sma200) trendSignal = 'BULLISH (Golden Cross)';
    else trendSignal = 'BEARISH (Death Cross)';
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Quantitative & Technical Analysis Studio
          </h1>
          <p className="text-xs text-slate-400">TradingView Lightweight Charts • 28-digit arbitrary precision math</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {[30, 60, 100, 200].map((bars) => (
              <button
                key={bars}
                onClick={() => setLimit(bars)}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  limit === bars ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {bars}D
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 w-24 font-bold text-center focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => loadTechnicals(symbol, limit)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Quantitative Indicators Metric Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            title="14-Day RSI"
            value={rsi !== null && rsi !== undefined ? Number(rsi).toFixed(2) : 'N/A'}
            subtitle={rsiSignal}
            icon={<Gauge className="w-4 h-4" />}
          />
          <MetricCard
            title="SMA 50 / SMA 200"
            value={sma50 ? `$${Number(sma50).toFixed(2)}` : 'N/A'}
            subtitle={trendSignal}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <MetricCard
            title="MACD Histogram"
            value={latest.macd_histogram !== null && latest.macd_histogram !== undefined ? Number(latest.macd_histogram).toFixed(2) : 'N/A'}
            subtitle={`Signal: ${latest.macd_signal ?? 'N/A'}`}
            icon={<SlidersHorizontal className="w-4 h-4" />}
          />
          <MetricCard
            title="Bollinger Bands"
            value={latest.bollinger_middle ? `$${Number(latest.bollinger_middle).toFixed(2)}` : 'N/A'}
            subtitle={`[${latest.bollinger_lower ?? '-'} - ${latest.bollinger_upper ?? '-'}]`}
            icon={<LineChart className="w-4 h-4" />}
          />
          <MetricCard
            title="Annualized Volatility"
            value={latest.annualized_volatility ? `${(Number(latest.annualized_volatility) * 100).toFixed(1)}%` : 'N/A'}
            subtitle="252 Trading Days"
            icon={<Activity className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Candlestick Canvas */}
      {data && data.candlesticks && (
        <div className="space-y-2">
          <CandlestickChart
            data={data.candlesticks}
            indicators={data.indicators}
            symbol={symbol}
            currency={data.currency || 'USD'}
            height={500}
          />
          <div className="flex items-center justify-between text-xs text-slate-500 px-2">
            <span>Provider: <strong className="text-slate-400">{data.provider}</strong></span>
            <span>Total Bars Evaluated: <strong className="text-slate-400">{data.total_bars}</strong></span>
            <span>Currency: <strong className="text-slate-400">{data.currency}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
