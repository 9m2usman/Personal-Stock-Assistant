import React, { useState } from 'react';
import { Sliders, Play, TrendingDown, TrendingUp, Sparkles, RefreshCcw } from 'lucide-react';
import { simulateWhatIf } from '../api/client.ts';
import { MetricCard } from '../components/MetricCard.tsx';
import { formatCurrency, formatPercent, formatRatio } from '../utils/financial.ts';

export const ScenarioLab: React.FC = () => {
  const [shockPercent, setShockPercent] = useState<number>(-10);
  const [capitalInjection, setCapitalInjection] = useState<number>(5000);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const baselineHoldings = [
    { symbol: 'NVDA', quantity: 30, average_cost: 110.0, currency: 'USD' },
    { symbol: 'AAPL', quantity: 40, average_cost: 180.0, currency: 'USD' },
    { symbol: 'MSFT', quantity: 20, average_cost: 390.0, currency: 'USD' },
    { symbol: 'TSLA', quantity: 15, average_cost: 210.0, currency: 'USD' },
  ];

  const runSimulation = async () => {
    setLoading(true);
    try {
      const scenario = {
        market_shock_percent: shockPercent,
        capital_injection: capitalInjection,
        reallocations: {},
      };
      const res = await simulateWhatIf(baselineHoldings, scenario, 'USD');
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          What-If Scenario & Market Stress Testing Lab
        </h1>
        <p className="text-xs text-slate-400">
          Simulate macro shocks, capital additions, and portfolio resilience without risk
        </p>
      </div>

      {/* Interactive Controls Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Market Shock Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Broad Market Shock</span>
              <span className={`px-2 py-0.5 rounded ${shockPercent < 0 ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'}`}>
                {shockPercent > 0 ? `+${shockPercent}%` : `${shockPercent}%`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              step="5"
              value={shockPercent}
              onChange={(e) => setShockPercent(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>-40% (Crash)</span>
              <span>0% (Neutral)</span>
              <span>+40% (Bull Rally)</span>
            </div>
          </div>

          {/* Capital Addition Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Capital Injection ($)</span>
              <span className="text-emerald-400 font-bold">${capitalInjection.toLocaleString()}</span>
            </div>
            <input
              type="number"
              step="1000"
              value={capitalInjection}
              onChange={(e) => setCapitalInjection(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <div className="text-[10px] text-slate-500">Simulate newly added funds into portfolio cash reserve</div>
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {loading ? 'Simulating Dynamic Scenario...' : 'Execute What-If Simulation'}
        </button>
      </div>

      {/* Simulation Results */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Original Value"
              value={formatCurrency(result.original_total_value, 2)}
              subtitle="Baseline Portfolio"
            />
            <MetricCard
              title="Simulated Future Value"
              value={formatCurrency(result.simulated_total_value, 2)}
              change={result.total_value_change >= 0 ? `+${formatCurrency(result.total_value_change, 2)}` : `-${formatCurrency(Math.abs(result.total_value_change), 2)}`}
              changePercent={result.total_value_change_percent}
            />
            <MetricCard
              title="Net Impact"
              value={formatCurrency(result.total_value_change, 2)}
              subtitle={`${formatPercent(result.total_value_change_percent, 2, true)} Delta`}
            />
            <MetricCard
              title="Projected HHI"
              value={formatRatio(result.simulated_hhi, 3)}
              subtitle={`Baseline: ${formatRatio(result.original_hhi, 3)}`}
            />
          </div>

          {/* Position Delta Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Projected Asset Dynamics</h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5">Asset</th>
                    <th className="py-2.5 text-right">Original Value</th>
                    <th className="py-2.5 text-right">Simulated Value</th>
                    <th className="py-2.5 text-right">Delta ($)</th>
                    <th className="py-2.5 text-right">New Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {result.simulated_positions.map((p: any, idx: number) => {
                    const isUp = p.value_change >= 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-850/50 transition">
                        <td className="py-2.5 font-bold text-slate-100">{p.symbol}</td>
                        <td className="py-2.5 text-right">{formatCurrency(p.original_value, 2)}</td>
                        <td className="py-2.5 text-right font-semibold text-slate-100">{formatCurrency(p.simulated_value, 2)}</td>
                        <td className={`py-2.5 text-right font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? `+${formatCurrency(p.value_change, 2)}` : `-${formatCurrency(Math.abs(p.value_change), 2)}`}
                        </td>
                        <td className="py-2.5 text-right font-bold text-slate-200">{formatPercent(p.new_weight_percent, 2, true)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
