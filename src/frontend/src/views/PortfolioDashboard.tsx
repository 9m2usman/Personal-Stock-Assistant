import React, { useState } from 'react';
import { Upload, PieChart, AlertTriangle, ArrowUpRight, ArrowDownRight, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { uploadPortfolioSpreadsheet, evaluatePortfolio } from '../api/client.ts';
import { MetricCard } from '../components/MetricCard.tsx';
import { formatCurrency, formatPercent, formatRatio } from '../utils/financial.ts';

const COLORS = ['#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export const PortfolioDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const res = await uploadPortfolioSpreadsheet(file, 'USD');
      setAnalytics(res);
    } catch (err: any) {
      setError(err.message || 'Error processing spreadsheet');
    } finally {
      setLoading(false);
    }
  };

  const loadSamplePortfolio = async () => {
    setLoading(true);
    setError(null);
    try {
      const sample = [
        { symbol: 'NVDA', quantity: 30, average_cost: 110.0, currency: 'USD' },
        { symbol: 'AAPL', quantity: 40, average_cost: 180.0, currency: 'USD' },
        { symbol: 'MSFT', quantity: 20, average_cost: 390.0, currency: 'USD' },
        { symbol: 'TSLA', quantity: 15, average_cost: 210.0, currency: 'USD' },
        { symbol: 'HSBA', quantity: 300, average_cost: 6.5, currency: 'GBP' },
      ];
      const res = await evaluatePortfolio(sample, 'USD');
      setAnalytics(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pieData = analytics?.positions?.map((p: any) => ({
    name: p.symbol,
    value: p.market_value,
  })) || [];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            Excel Portfolio Integration & Asset Allocation
          </h1>
          <p className="text-xs text-slate-400">Fuzzy spreadsheet ingestion • Real-time ECB currency normalization • HHI Concentration Index</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium rounded-lg text-xs transition shadow-md">
            <Upload className="w-4 h-4" />
            Upload Excel (.xlsx/.csv)
            <input type="file" accept=".xlsx,.csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={loadSamplePortfolio}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
          >
            Load Sample Tech Portfolio
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm">
          Processing portfolio spreadsheet and calculating live FX spot rates...
        </div>
      )}

      {!loading && analytics && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Portfolio Value"
              value={formatCurrency(analytics.total_market_value, 2)}
              subtitle={analytics.base_currency}
            />
            <MetricCard
              title="Unrealized P&L"
              value={formatCurrency(analytics.total_unrealized_pnl, 2)}
              change={analytics.total_unrealized_pnl >= 0 ? `+${formatCurrency(analytics.total_unrealized_pnl, 2)}` : `-${formatCurrency(Math.abs(analytics.total_unrealized_pnl), 2)}`}
              changePercent={analytics.total_unrealized_pnl_percent}
            />
            <MetricCard
              title="Total Cost Basis"
              value={formatCurrency(analytics.total_cost_basis, 2)}
              subtitle="Invested Capital"
            />
            <MetricCard
              title="Herfindahl Index (HHI)"
              value={formatRatio(analytics.herfindahl_index, 3)}
              subtitle={analytics.concentration_risk_level}
              icon={<ShieldAlert className="w-4 h-4" />}
            />
          </div>

          {/* Risk Alerts */}
          {analytics.risk_warnings && analytics.risk_warnings.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 text-xs text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Concentration & Allocation Warnings</span>
              </div>
              {analytics.risk_warnings.map((w: string, idx: number) => (
                <div key={idx} className="ml-5 list-disc">• {w}</div>
              ))}
            </div>
          )}

          {/* Allocation Donut & Holdings Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center justify-center">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Asset Weight Allocation</h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {pieData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Value']}
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Normalized Holdings</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5">Symbol</th>
                      <th className="py-2.5 text-right">Shares</th>
                      <th className="py-2.5 text-right">Current Price</th>
                      <th className="py-2.5 text-right">Market Value</th>
                      <th className="py-2.5 text-right">Unrealized P&L</th>
                      <th className="py-2.5 text-right">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {analytics.positions.map((pos: any, idx: number) => {
                      const isProfit = (pos.unrealized_pnl || 0) >= 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-850/50 transition">
                          <td className="py-2.5 font-bold text-slate-100 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                            {pos.symbol}
                          </td>
                          <td className="py-2.5 text-right">{pos.quantity}</td>
                          <td className="py-2.5 text-right">{formatCurrency(pos.current_price, 2)}</td>
                          <td className="py-2.5 text-right font-semibold text-slate-100">{formatCurrency(pos.market_value, 2)}</td>
                          <td className={`py-2.5 text-right font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? `+${formatCurrency(pos.unrealized_pnl, 2)}` : `-${formatCurrency(Math.abs(pos.unrealized_pnl), 2)}`} ({formatPercent(pos.unrealized_pnl_percent, 2, true)})
                          </td>
                          <td className="py-2.5 text-right font-bold text-slate-200">{formatPercent(pos.weight_percent, 2, true)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !analytics && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
          <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-200">No Portfolio Loaded Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload your personal investment spreadsheet (.xlsx or .csv) or click the sample button above to simulate multi-currency portfolio analytics, spot exchange conversion, and concentration risk metrics.
          </p>
        </div>
      )}
    </div>
  );
};
