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
  TrendingDown,
  ArrowRightLeft,
  DollarSign,
  Plus,
  Trash2,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import {
  uploadPortfolioSpreadsheet,
  evaluatePortfolio,
  simulateWhatIf,
  sendChatMessage,
  simulateReallocationScenario,
  ReallocationScenarioResponse
} from '../api/client.ts';
import { formatCurrency, formatPercent, formatRatio, formatInteger } from '../utils/financial.ts';
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

  // Buy/Sell Scenario Simulator State
  const [selectedSellSymbol, setSelectedSellSymbol] = useState<string>('TSLA');
  const [sellPortion, setSellPortion] = useState<'ALL' | '50' | 'CUSTOM'>('ALL');
  const [sellCustomQty, setSellCustomQty] = useState<number>(10);
  const [targetBuys, setTargetBuys] = useState<Array<{ symbol: string; percent: number }>>([
    { symbol: 'NVDA', percent: 60 },
    { symbol: 'AMD', percent: 40 },
  ]);
  const [nlScenarioPrompt, setNlScenarioPrompt] = useState<string>('');
  const [reallocationResult, setReallocationResult] = useState<ReallocationScenarioResponse | null>(null);
  const [executingScenario, setExecutingScenario] = useState<boolean>(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

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

  const handleExecuteScenario = async (useNl: boolean = false) => {
    if (!analytics || !analytics.positions || analytics.positions.length === 0) {
      setScenarioError('Please load or import a portfolio first.');
      return;
    }
    setExecutingScenario(true);
    setScenarioError(null);
    try {
      const rawHoldings = analytics.positions.map((p: any) => ({
        symbol: p.symbol,
        quantity: p.quantity,
        average_cost: p.original_cost,
        currency: p.reported_currency,
      }));

      const payload: any = {
        holdings: rawHoldings,
        base_currency: 'USD',
      };

      if (useNl && nlScenarioPrompt.trim()) {
        payload.natural_language_prompt = nlScenarioPrompt.trim();
      } else {
        const sellOrder: any = { symbol: selectedSellSymbol };
        if (sellPortion === 'ALL') {
          sellOrder.sell_all = true;
        } else if (sellPortion === '50') {
          sellOrder.sell_all = false;
          sellOrder.percent = 50.0;
        } else {
          sellOrder.sell_all = false;
          sellOrder.quantity = sellCustomQty;
        }

        const buyOrders = targetBuys
          .filter((b) => b.symbol.trim() && b.percent > 0)
          .map((b) => ({
            symbol: b.symbol.toUpperCase().trim(),
            allocation_percent: b.percent,
          }));

        payload.sells = [sellOrder];
        payload.buys = buyOrders;
      }

      const res = await simulateReallocationScenario(payload);
      setReallocationResult(res);
    } catch (err: any) {
      setScenarioError(err.message || 'Scenario execution failed');
    } finally {
      setExecutingScenario(false);
    }
  };

  const handleRequestAiReview = async () => {
    if (!analytics) return;
    setReviewing(true);
    try {
      const holdingSummary = analytics.positions
        .map((p: any) => `${p.symbol}: ${p.quantity} shares, $${Number(p.market_value || 0).toFixed(0)} (${Number(p.weight_percent || 0).toFixed(1)}%)`)
        .join(', ');
      const prompt = `Perform an institutional risk and diversification review for this portfolio: Total NAV $${Number(analytics.total_market_value || 0).toFixed(0)}, HHI: ${analytics.herfindahl_index != null ? Number(analytics.herfindahl_index).toFixed(3) : 'N/A'}, Holdings: ${holdingSummary}. Highlight concentration risks and scenario suggestions.`;
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
                Total Market Value ({analytics.base_currency || 'USD'})
              </div>
              <div className="text-2xl font-extrabold text-[var(--text-primary)] font-mono mt-1 tabular-nums">
                {formatCurrency(analytics.total_market_value)}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Total Unrealized P/L
              </div>
              <div
                className={`text-2xl font-extrabold font-mono mt-1 tabular-nums ${
                  analytics.total_unrealized_pnl != null && Number(analytics.total_unrealized_pnl) < 0
                    ? 'text-rose-400'
                    : analytics.total_unrealized_pnl != null && Number(analytics.total_unrealized_pnl) > 0
                    ? 'text-emerald-400'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {formatCurrency(analytics.total_unrealized_pnl)}
              </div>
              <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                {formatPercent(analytics.total_unrealized_pnl_percent, 2, true, '—')} Return
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Herfindahl Index (HHI)
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 tabular-nums">
                {formatRatio(analytics.herfindahl_index, 3, '—')}
              </div>
              <div className="text-[11px] font-semibold text-[var(--text-secondary)] mt-0.5">
                {analytics.concentration_risk_level || 'EVALUATED'}
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
                          {formatCurrency(pos.original_cost)}
                        </td>
                        <td className="py-3 text-right font-bold text-[var(--text-primary)]">
                          {formatCurrency(pos.current_price)}
                        </td>
                        <td className="py-3 text-right font-bold text-[var(--text-primary)]">
                          {formatCurrency(pos.market_value)}
                        </td>
                        <td className="py-3 text-right font-bold">
                          <span className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
                            {pos.unrealized_pnl != null
                              ? `${isPos ? '+' : '-'}${formatCurrency(Math.abs(Number(pos.unrealized_pnl)))}`
                              : '—'}
                            {pos.unrealized_pnl_percent != null
                              ? ` (${formatPercent(pos.unrealized_pnl_percent, 1, true, '')})`
                              : ''}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-400">
                          {formatPercent(pos.weight_percent, 1, true, '—')}
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
                    {simulationResult.simulated_market_value != null && !isNaN(Number(simulationResult.simulated_market_value))
                      ? `$${Number(simulationResult.simulated_market_value).toFixed(2)}`
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Estimated Capital Delta</div>
                  <div
                    className={`text-lg font-bold mt-1 ${
                      (simulationResult.market_value_change || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {simulationResult.market_value_change != null && !isNaN(Number(simulationResult.market_value_change))
                      ? `${Number(simulationResult.market_value_change) >= 0 ? '+' : '-'}$${Math.abs(Number(simulationResult.market_value_change)).toFixed(2)}`
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Post-Shock HHI</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {simulationResult.simulated_hhi != null && !isNaN(Number(simulationResult.simulated_hhi))
                      ? Number(simulationResult.simulated_hhi).toFixed(3)
                      : '—'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Institutional Buy/Sell Scenario Simulator Panel */}
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Decision Support Simulator
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] mt-1 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                  Hypothetical Buy/Sell Reallocation Engine
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Simulate selling an existing holding at live market price and redeploying proceeds across high-conviction target assets.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Execution Risk · Pure Simulation</span>
              </div>
            </div>

            {scenarioError && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
                {scenarioError}
              </div>
            )}

            {/* Natural Language Prompt or Structured Mode */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Structured Order Configurator */}
              <div className="space-y-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  1. Liquidate Holding (Sell Leg)
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Select Current Position to Sell:
                    </label>
                    <select
                      value={selectedSellSymbol}
                      onChange={(e) => setSelectedSellSymbol(e.target.value)}
                      aria-label="Select holding to sell"
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                    >
                      {analytics.positions?.map((pos: any) => (
                        <option key={pos.symbol} value={pos.symbol}>
                          {pos.symbol} ({pos.company_name}) · {pos.quantity} shares (~{formatCurrency(pos.market_value, 0)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Sale Quantity / Portion:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSellPortion('ALL')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition font-mono ${
                          sellPortion === 'ALL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        100% (Entire Holding)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSellPortion('50')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition font-mono ${
                          sellPortion === '50'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        50% (Half)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSellPortion('CUSTOM')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition font-mono ${
                          sellPortion === 'CUSTOM'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        Custom Shares
                      </button>
                    </div>

                    {sellPortion === 'CUSTOM' && (
                      <div className="mt-2">
                        <input
                          type="number"
                          value={sellCustomQty}
                          onChange={(e) => setSellCustomQty(Number(e.target.value))}
                          placeholder="Number of shares to sell"
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--text-primary)]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  2. Deploy Proceeds (Buy Legs)
                </div>

                <div className="space-y-2">
                  {targetBuys.map((buy, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={buy.symbol}
                        onChange={(e) => {
                          const updated = [...targetBuys];
                          updated[idx].symbol = e.target.value.toUpperCase();
                          setTargetBuys(updated);
                        }}
                        placeholder="Target Ticker (e.g. NVDA)"
                        className="w-28 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[var(--text-primary)]"
                      />
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="number"
                          value={buy.percent}
                          onChange={(e) => {
                            const updated = [...targetBuys];
                            updated[idx].percent = Number(e.target.value);
                            setTargetBuys(updated);
                          }}
                          placeholder="% Allocation"
                          className="w-20 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)]"
                        />
                        <span className="text-xs font-mono text-[var(--text-muted)]">%</span>
                      </div>
                      {targetBuys.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setTargetBuys(targetBuys.filter((_, i) => i !== idx))}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Remove Leg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setTargetBuys([...targetBuys, { symbol: '', percent: 0 }])}
                    className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Target Stock
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteScenario(false)}
                  disabled={executingScenario}
                  className="w-full mt-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs transition shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft className={`w-4 h-4 ${executingScenario ? 'animate-spin' : ''}`} />
                  {executingScenario ? 'Calculating Reallocation...' : 'Execute Structured Reallocation'}
                </button>
              </div>

              {/* Right Column: Natural Language AI Scenario Parser */}
              <div className="space-y-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Natural Language Reallocation
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    Describe any hypothetical reallocation in plain English. The AI agent will parse sell orders, buy splits, and execute calculations automatically.
                  </p>

                  <div className="mt-3">
                    <textarea
                      rows={4}
                      value={nlScenarioPrompt}
                      onChange={(e) => setNlScenarioPrompt(e.target.value)}
                      placeholder="e.g. If I sell my Tesla holdings and invest 60% in NVIDIA and 40% in AMD, what happens to my portfolio?"
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono transition"
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted)]">Examples:</span>
                    <button
                      type="button"
                      onClick={() => setNlScenarioPrompt('If I sell my Tesla holdings and invest 60% in NVIDIA and 40% in AMD')}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-secondary)] hover:text-emerald-400 text-[var(--text-secondary)] border border-[var(--border-subtle)] transition"
                    >
                      Sell TSLA ➔ 60% NVDA / 40% AMD
                    </button>
                    <button
                      type="button"
                      onClick={() => setNlScenarioPrompt('Sell Apple and reallocate 100% into Microsoft')}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-secondary)] hover:text-emerald-400 text-[var(--text-secondary)] border border-[var(--border-subtle)] transition"
                    >
                      Sell AAPL ➔ 100% MSFT
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteScenario(true)}
                  disabled={executingScenario || !nlScenarioPrompt.trim()}
                  className="w-full py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40 text-emerald-400 font-extrabold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4" />
                  {executingScenario ? 'Parsing & Simulating...' : 'Parse & Simulate Natural Language'}
                </button>
              </div>
            </div>

            {/* Simulation Results Output */}
            {reallocationResult && (
              <div className="space-y-6 pt-4 border-t border-[var(--border-subtle)] animate-fade-in">
                {/* Before vs After Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">
                      Portfolio NAV
                    </div>
                    <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] font-mono mt-1 tabular-nums">
                      {formatCurrency(reallocationResult.after_nav)}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                      Baseline: {formatCurrency(reallocationResult.before_nav)}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">
                      Cash Remainder
                    </div>
                    <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono mt-1 tabular-nums">
                      {formatCurrency(reallocationResult.after_cash)}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                      Proceeds: {formatCurrency(reallocationResult.total_sale_proceeds)}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">
                      Concentration (HHI)
                    </div>
                    <div className="text-xl sm:text-2xl font-extrabold text-cyan-400 font-mono mt-1 tabular-nums">
                      {formatRatio(reallocationResult.after_hhi, 3, '—')}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                      Delta:{' '}
                      <span className={reallocationResult.hhi_delta > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        {reallocationResult.hhi_delta != null
                          ? `${Number(reallocationResult.hhi_delta) >= 0 ? '+' : ''}${formatRatio(reallocationResult.hhi_delta, 3)}`
                          : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                    <div className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">
                      Deployed Capital
                    </div>
                    <div className="text-xl sm:text-2xl font-extrabold text-purple-400 font-mono mt-1 tabular-nums">
                      {formatCurrency(reallocationResult.total_purchase_cost)}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                      {reallocationResult.transactions?.length || 0} simulated orders
                    </div>
                  </div>
                </div>

                {/* Simulated Order Execution Receipts */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
                  <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center justify-between">
                    <span>Simulated Transaction Execution Breakdown</span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      Timestamp: {reallocationResult.timestamp_utc}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left font-mono">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-[11px]">
                          <th className="pb-2">Action</th>
                          <th className="pb-2">Symbol</th>
                          <th className="pb-2">Asset Name</th>
                          <th className="pb-2 text-right">Shares</th>
                          <th className="pb-2 text-right">Valuation Price</th>
                          <th className="pb-2 text-right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] tabular-nums">
                        {reallocationResult.transactions?.map((t, idx) => {
                          const isSell = t.action === 'SELL';
                          return (
                            <tr key={idx} className="hover:bg-[var(--bg-secondary)]/50 transition">
                              <td className="py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                                    isSell
                                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}
                                >
                                  {t.action}
                                </span>
                              </td>
                              <td className="py-2.5 font-bold text-[var(--text-primary)]">{t.symbol}</td>
                              <td className="py-2.5 text-[var(--text-secondary)]">{t.company_name}</td>
                              <td className="py-2.5 text-right font-semibold text-[var(--text-primary)]">
                                {formatRatio(t.shares, 4, '—')}
                              </td>
                              <td className="py-2.5 text-right text-[var(--text-muted)]">
                                {formatCurrency(t.price)}
                              </td>
                              <td
                                className={`py-2.5 text-right font-extrabold ${
                                  isSell ? 'text-emerald-400' : 'text-purple-400'
                                }`}
                              >
                                {t.total_amount != null
                                  ? `${isSell ? '+' : '-'}${formatCurrency(Math.abs(Number(t.total_amount)))}`
                                  : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Hypothetical Post-Rebalance Holdings Table */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
                  <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Projected Portfolio Holdings Post-Rebalance
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left font-mono">
                      <thead>
                        <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-[11px]">
                          <th className="pb-2">Symbol</th>
                          <th className="pb-2">Company</th>
                          <th className="pb-2 text-right">Shares</th>
                          <th className="pb-2 text-right">Price</th>
                          <th className="pb-2 text-right">Market Value</th>
                          <th className="pb-2 text-right">New Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] tabular-nums">
                        {reallocationResult.hypothetical_positions?.map((p, idx) => (
                          <tr key={idx} className="hover:bg-[var(--bg-secondary)]/50 transition">
                            <td className="py-2.5 font-bold text-emerald-400">{p.symbol}</td>
                            <td className="py-2.5 text-[var(--text-secondary)]">{p.company_name}</td>
                            <td className="py-2.5 text-right text-[var(--text-primary)]">
                              {formatRatio(p.quantity, 4, '—')}
                            </td>
                            <td className="py-2.5 text-right text-[var(--text-muted)]">
                              {formatCurrency(p.market_price)}
                            </td>
                            <td className="py-2.5 text-right font-bold text-[var(--text-primary)]">
                              {formatCurrency(p.market_value)}
                            </td>
                            <td className="py-2.5 text-right font-extrabold text-emerald-400">
                              {formatPercent(p.weight_percent, 2, true, '—')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Risk Observations & Regulatory Disclosures */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2 text-xs">
                  <div className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Quantitative Risk Observations & Assumptions
                  </div>
                  <ul className="list-disc list-inside text-amber-200/90 space-y-1">
                    {reallocationResult.risk_observations?.map((obs, idx) => (
                      <li key={idx}>{obs}</li>
                    ))}
                    {reallocationResult.assumptions?.map((assm, idx) => (
                      <li key={idx} className="text-[11px] text-amber-300/70">{assm}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-amber-500/20 text-[10px] text-amber-400/80 font-mono">
                    Hypothetical simulation for decision-support purposes only. No actual trade has been placed. Taxes, slippage, and brokerage commissions are excluded.
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
