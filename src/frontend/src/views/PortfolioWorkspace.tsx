import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Upload,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  ShieldAlert,
  Sliders,
  Bot,
  CheckCircle2,
  X,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { uploadPortfolioSpreadsheet, evaluatePortfolio, simulateWhatIf, sendChatMessage } from '../api/client.ts';
import { useTheme } from '../context/ThemeContext.tsx';

const COLORS = ['#20c997', '#69a8f5', '#e9b85c', '#f06b73', '#a855f7', '#06b6d4', '#96a4b3'];

export const PortfolioWorkspace: React.FC<{ onNavigateToAssistant?: () => void }> = ({
  onNavigateToAssistant,
}) => {
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('inkvector_portfolio_analytics');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync analytics to localStorage whenever it changes
  useEffect(() => {
    if (analytics) {
      try {
        localStorage.setItem('inkvector_portfolio_analytics', JSON.stringify(analytics));
      } catch (e) {
        console.error('Failed to save portfolio to localStorage', e);
      }
    }
  }, [analytics]);

  // Excel Import Multi-Step Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    symbol: 0,
    quantity: 1,
    cost: 2,
    currency: 3,
  });

  // What-If Simulation State
  const [shockPercent, setShockPercent] = useState<number>(-10);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  // AI Review State
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const sampleHoldings = [
    { symbol: 'NVDA', quantity: 30, average_cost: 110.0, currency: 'USD' },
    { symbol: 'AAPL', quantity: 40, average_cost: 180.0, currency: 'USD' },
    { symbol: 'MSFT', quantity: 20, average_cost: 390.0, currency: 'USD' },
    { symbol: 'TSLA', quantity: 15, average_cost: 210.0, currency: 'USD' },
    { symbol: 'HSBA', quantity: 300, average_cost: 6.5, currency: 'GBP' },
  ];

  const loadSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await evaluatePortfolio(sampleHoldings, 'USD');
      setAnalytics(res);
    } catch (err: any) {
      setError(err.message || 'Error loading sample portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawFile(file);

    // Read initial preview text lines
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      const parsed = lines.slice(0, 8).map((l) => l.split(/,|\t/).map((c) => c.trim().replace(/^"|"$/g, '')));
      setPreviewRows(parsed);
      setImportStep(2);
    };
    reader.readAsText(file.slice(0, 4096)); // read first 4KB for preview
  };

  const handleConfirmImport = async () => {
    if (!rawFile) return;
    setLoading(true);
    setError(null);
    setIsImportModalOpen(false);
    try {
      const res = await uploadPortfolioSpreadsheet(rawFile, 'USD');
      setAnalytics(res);
    } catch (err: any) {
      setError(err.message || 'Failed to process portfolio spreadsheet');
    } finally {
      setLoading(false);
      setRawFile(null);
      setImportStep(1);
    }
  };

  const handleRunSimulation = async (shock: number) => {
    if (!analytics || !analytics.positions) return;
    setSimulating(true);
    try {
      const rawPositions = analytics.positions.map((p: any) => ({
        symbol: p.symbol,
        quantity: p.quantity,
        average_cost: p.original_cost,
        currency: p.reported_currency,
      }));

      const res = await simulateWhatIf(
        rawPositions,
        {
          market_shock_percent: shock,
          shocked_symbols: [],
          cash_injection: 0.0,
        },
        'USD'
      );
      setSimulationResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleRequestAiReview = async () => {
    if (!analytics) return;
    setReviewing(true);
    try {
      const holdingSummary = analytics.positions
        .map((p: any) => `${p.symbol}: ${p.quantity} shares, $${p.market_value.toFixed(0)} (${p.weight_percent.toFixed(1)}%)`)
        .join(', ');
      const prompt = `Perform an institutional risk and diversification review for this portfolio: Total NAV $${analytics.total_market_value.toFixed(0)}, HHI: ${analytics.herfindahl_index.toFixed(3)}, Holdings: ${holdingSummary}. Highlight concentration risks and scenario suggestions.`;
      const res = await sendChatMessage(prompt, 'portfolio_review');
      setAiReview(res.answer);
    } catch (err: any) {
      setAiReview('Failed to generate AI review. Verify backend LLM or router connectivity.');
    } finally {
      setReviewing(false);
    }
  };

  const pieData =
    analytics?.positions?.map((p: any) => ({
      name: p.symbol,
      value: p.market_value,
    })) || [];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Institutional Asset Management
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-emerald-400" />
            Portfolio Ingestion & Stress Analytics
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Multi-currency normalization via ECB live spot FX, Herfindahl concentration index, and What-If scenario simulations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
          >
            <Upload className="w-4 h-4" />
            Import Excel / CSV
          </button>

          <button
            onClick={loadSample}
            className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-emerald-500 text-xs font-semibold text-[var(--text-primary)] transition"
          >
            Load Sample Tech Portfolio
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-20 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
          <span>Evaluating positions against live exchange quotes & ECB spot rates...</span>
        </div>
      )}

      {/* Main Portfolio Dashboard Content */}
      {!loading && analytics && (
        <div className="space-y-6">
          {/* Top Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Total Market Value ({analytics.base_currency})
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-primary)] font-mono mt-1 tabular-nums">
                ${analytics.total_market_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Total Unrealized P/L
              </div>
              <div
                className={`text-2xl font-extrabold font-mono mt-1 tabular-nums ${
                  analytics.total_unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {analytics.total_unrealized_pnl >= 0 ? '+' : ''}$
                {analytics.total_unrealized_pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                {analytics.total_unrealized_pnl_percent >= 0 ? '+' : ''}
                {analytics.total_unrealized_pnl_percent.toFixed(2)}% Return
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Herfindahl Index (HHI)
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 tabular-nums">
                {analytics.herfindahl_index.toFixed(3)}
              </div>
              <div className="text-[11px] font-semibold text-[var(--text-secondary)] mt-0.5">
                {analytics.concentration_risk_level}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Risk & Concentration
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                  {analytics.risk_warnings?.[0] || 'Portfolio is well diversified across market caps.'}
                </div>
              </div>
              <button
                onClick={handleRequestAiReview}
                disabled={reviewing}
                className="mt-2 text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Bot className="w-3.5 h-3.5" />
                {reviewing ? 'Analyzing...' : 'Run AI Risk Review'}
              </button>
            </div>
          </div>

          {/* AI Review Banner */}
          {aiReview && (
            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  Autonomous AI Portfolio Assessment
                </div>
                <button
                  onClick={() => setAiReview(null)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                {aiReview}
              </div>
            </div>
          )}

          {/* Allocation Visuals & Holdings Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie Allocation */}
            <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Asset Allocation Weights
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {pieData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {pieData.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-[var(--text-secondary)]">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Holdings Table (2 Cols) */}
            <div className="lg:col-span-2 p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-x-auto space-y-3">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Current Holdings ({analytics.positions?.length || 0})
              </h3>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono">
                    <th className="pb-3">Security</th>
                    <th className="pb-3 text-right">Shares</th>
                    <th className="pb-3 text-right">Avg Cost</th>
                    <th className="pb-3 text-right">Live Price</th>
                    <th className="pb-3 text-right">Market Value</th>
                    <th className="pb-3 text-right">Unrealized P/L</th>
                    <th className="pb-3 text-right">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono tabular-nums">
                  {analytics.positions?.map((pos: any) => {
                    const isPos = pos.unrealized_pnl >= 0;
                    return (
                      <tr key={pos.symbol} className="hover:bg-[var(--bg-card)]/50 transition">
                        <td className="py-3 font-bold text-emerald-400">
                          {pos.symbol}{' '}
                          <span className="text-[10px] text-[var(--text-muted)] font-normal">
                            ({pos.reported_currency})
                          </span>
                        </td>
                        <td className="py-3 text-right text-[var(--text-primary)]">{pos.quantity}</td>
                        <td className="py-3 text-right text-[var(--text-muted)]">
                          ${pos.original_cost.toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-bold text-[var(--text-primary)]">
                          ${pos.current_price.toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-bold text-[var(--text-primary)]">
                          ${pos.market_value.toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-bold">
                          <span className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPos ? '+' : ''}${pos.unrealized_pnl.toFixed(2)} ({isPos ? '+' : ''}
                            {pos.unrealized_pnl_percent.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-400">
                          {pos.weight_percent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* What-If Stress Testing Panel */}
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  What-If Scenario Simulation & Market Shock Engine
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Simulate macro interest rate shocks, tech sell-offs, or bull runs across your holdings.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShockPercent(-10); handleRunSimulation(-10); }}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition"
                >
                  -10% Market Shock
                </button>
                <button
                  onClick={() => { setShockPercent(15); handleRunSimulation(15); }}
                  className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition"
                >
                  +15% Bull Rally
                </button>
              </div>
            </div>

            {simulationResult && (
              <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Simulated Market NAV</div>
                  <div className="text-lg font-bold text-[var(--text-primary)] mt-1">
                    ${simulationResult.simulated_market_value?.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Estimated Capital Delta</div>
                  <div
                    className={`text-lg font-bold mt-1 ${
                      simulationResult.market_value_change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {simulationResult.market_value_change >= 0 ? '+' : ''}$
                    {simulationResult.market_value_change?.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Post-Shock HHI</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {simulationResult.simulated_hhi?.toFixed(3)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State when no portfolio loaded */}
      {!loading && !analytics && (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4 max-w-md mx-auto p-6">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-emerald-400" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            No Portfolio Connected Yet
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Import an Excel spreadsheet (.xlsx, .csv) with your equity positions or click "Load Sample Tech Portfolio" to explore institutional analytics.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-md shadow-emerald-500/20"
            >
              Upload Spreadsheet
            </button>
            <button
              onClick={loadSample}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-primary)] hover:border-emerald-500 transition"
            >
              Sample Portfolio
            </button>
          </div>
        </div>
      )}

      {/* Excel Import Multi-Step Workflow Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-2xl rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {importStep === 1 && 'Upload Excel or CSV Portfolio'}
                  {importStep === 2 && 'Preview Data & Map Columns'}
                  {importStep === 3 && 'Validation & Confirmation'}
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importStep === 1 && (
              <div className="space-y-4 py-4 text-center">
                <div className="p-8 border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-card)] space-y-3">
                  <Upload className="w-10 h-10 mx-auto text-emerald-400" />
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Select .xlsx, .xls, or .csv spreadsheet
                  </div>
                  <label className="cursor-pointer inline-block px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md transition">
                    Browse File
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {importStep === 2 && (
              <div className="space-y-4">
                <div className="text-xs text-[var(--text-secondary)]">
                  Preview of detected tabular data from <strong className="text-emerald-400">{rawFile?.name}</strong>:
                </div>

                <div className="max-h-48 overflow-y-auto border border-[var(--border-color)] rounded-xl bg-[var(--bg-card)] p-3">
                  <table className="w-full text-[11px] font-mono">
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-[var(--border-subtle)]">
                          {row.map((cell: string, j: number) => (
                            <td key={j} className="py-1 px-2 text-[var(--text-secondary)]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <button
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setImportStep(3)}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition"
                  >
                    Proceed to Validation
                  </button>
                </div>
              </div>
            )}

            {importStep === 3 && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Validation passed! Formatted headers and position amounts detected.
                </div>

                <div className="text-xs text-[var(--text-secondary)]">
                  Clicking confirm will execute live price evaluation across exchange data routers and normalize foreign currencies using ECB rates.
                </div>

                <div className="flex items-center justify-between pt-3">
                  <button
                    onClick={() => setImportStep(2)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)]"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md transition"
                  >
                    Confirm & Ingest Portfolio
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
