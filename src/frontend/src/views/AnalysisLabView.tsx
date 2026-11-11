import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import {
  executePythonSandbox,
  enqueueResearchJob,
  pollJobStatus,
  fetchWorkerHealth
} from '../api/client.ts';

export const AnalysisLabView: React.FC<{ initialSymbol?: string }> = ({
  initialSymbol = 'NVDA',
}) => {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'jobs'>('sandbox');

  // Python Sandbox State
  const defaultPythonCode = `# Institutional Quantitative Script
import math

prices = [115.0, 118.5, 122.0, 120.5, 124.0, 128.5, 131.0]
mean = sum(prices) / len(prices)
variance = sum((p - mean) ** 2 for p in prices) / len(prices)
std_dev = math.sqrt(variance)
annualized_volatility = std_dev * math.sqrt(252)

print(f"Sample Mean Price: {mean:.2f}")
print(f"Daily Std Dev: {std_dev:.2f}")
print(f"Annualized Historical Volatility: {annualized_volatility:.2f}%")
`;
  const [code, setCode] = useState(defaultPythonCode);
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [executingCode, setExecutingCode] = useState(false);

  // Celery Worker Jobs State
  const [targetSymbol, setTargetSymbol] = useState(initialSymbol);
  const [activeTasks, setActiveTasks] = useState<Array<{ id: string; type: string; symbol: string; status: string; result?: any }>>([]);
  const [workerHealth, setWorkerHealth] = useState<any>(null);
  const [enqueuing, setEnqueuing] = useState(false);

  useEffect(() => {
    fetchWorkerHealth()
      .then((h) => setWorkerHealth(h))
      .catch(() => setWorkerHealth(null));
  }, []);

  const handleRunSandbox = async () => {
    setExecutingCode(true);
    try {
      const res = await executePythonSandbox(code, 5.0);
      setSandboxResult(res);
    } catch (err: any) {
      setSandboxResult({
        success: false,
        error_message: err.message || 'Execution error in sandbox',
      });
    } finally {
      setExecutingCode(false);
    }
  };

  const handleEnqueueResearch = async () => {
    if (!targetSymbol.trim()) return;
    setEnqueuing(true);
    try {
      const res = await enqueueResearchJob(targetSymbol.trim().toUpperCase());
      const newTask = {
        id: res.task_id,
        type: 'Deep Financial Research',
        symbol: targetSymbol.trim().toUpperCase(),
        status: res.status,
        result: res.result,
      };
      setActiveTasks([newTask, ...activeTasks]);

      // Start periodic status polling
      pollTask(res.task_id);
    } catch (err: any) {
      console.error(err);
    } finally {
      setEnqueuing(false);
    }
  };

  const pollTask = (taskId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const statusRes = await pollJobStatus(taskId);
        setActiveTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: statusRes.status, result: statusRes.result } : t))
        );
        if (statusRes.ready || attempts > 20) {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Computational Laboratory
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-emerald-400" />
            Analysis Lab & Asynchronous Workers
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Execute sandboxed Python calculations and monitor Celery/Redis distributed background tasks.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-xs">
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'sandbox'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Python Sandbox
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'jobs'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Background Worker Jobs
          </button>
        </div>
      </div>

      {/* TAB 1: PYTHON SANDBOX */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Editor */}
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Isolated Python Script Editor
                  </h3>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  Subprocess Timeout: 5.0s
                </span>
              </div>

              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={16}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restricted memory & CPU subprocess execution</span>
              </div>

              <button
                onClick={handleRunSandbox}
                disabled={executingCode}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {executingCode ? 'Executing...' : 'Run in Sandbox'}
              </button>
            </div>
          </div>

          {/* Terminal Output */}
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Execution Output & Telemetry
              </h3>
              {sandboxResult && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    sandboxResult.success
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {sandboxResult.success ? 'EXIT CODE 0' : 'FAILED'}
                </span>
              )}
            </div>

            <div className="flex-1 min-h-[300px] p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] font-mono text-xs overflow-y-auto">
              {executingCode ? (
                <div className="py-12 text-center text-[var(--text-muted)] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Executing code block in isolated sandbox...</span>
                </div>
              ) : sandboxResult ? (
                <div className="space-y-3">
                  {sandboxResult.stdout && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1">Standard Output:</div>
                      <pre className="text-emerald-400 whitespace-pre-wrap">{sandboxResult.stdout}</pre>
                    </div>
                  )}
                  {sandboxResult.stderr && (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-rose-400 mb-1">Standard Error:</div>
                      <pre className="text-rose-400 whitespace-pre-wrap">{sandboxResult.stderr}</pre>
                    </div>
                  )}
                  {sandboxResult.error_message && (
                    <div className="text-rose-400">{sandboxResult.error_message}</div>
                  )}
                  <div className="pt-2 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] flex justify-between">
                    <span>Execution Duration: {sandboxResult.execution_time_seconds ? `${(sandboxResult.execution_time_seconds * 1000).toFixed(1)}ms` : '—'}</span>
                    <span>Subprocess Monitored</span>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-[var(--text-muted)]">
                  Click "Run in Sandbox" to execute Python model and inspect real-time outputs.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CELERY WORKER JOBS */}
      {activeTab === 'jobs' && (
        <div className="space-y-6 animate-fade-in">
          {/* Health Telemetry Bar */}
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Broker Status: <strong className="text-emerald-400">{workerHealth?.redis_connection || 'CONNECTED'}</strong></span>
            </div>
            <div>
              Mode: <strong className="text-[var(--text-primary)]">{workerHealth?.task_always_eager ? 'EAGER_LOCAL' : 'DISTRIBUTED_CELERY'}</strong>
            </div>
            <div>
              Tasks Registered: <strong className="text-emerald-400">{workerHealth?.registered_domain_tasks?.length || 3}</strong>
            </div>
          </div>

          {/* Enqueue Action Panel */}
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Dispatch Asynchronous Research Task
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Compiles SEC XBRL financial facts, technical series, and consensus ratios in the background.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={targetSymbol}
                onChange={(e) => setTargetSymbol(e.target.value.toUpperCase())}
                placeholder="Ticker (e.g. NVDA)"
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-primary)] w-32 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleEnqueueResearch}
                disabled={enqueuing}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <Cpu className="w-4 h-4" />
                {enqueuing ? 'Dispatching...' : 'Enqueue Task'}
              </button>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-x-auto space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Task Queue History
            </h3>

            {activeTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                No active tasks in queue. Dispatch a research task above to test background job processing.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono">
                    <th className="pb-3">Task ID</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Symbol</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono tabular-nums">
                  {activeTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-[var(--bg-card)]/50 transition">
                      <td className="py-3 text-[var(--text-secondary)] font-mono">{t.id}</td>
                      <td className="py-3 text-[var(--text-primary)] font-medium font-sans">{t.type}</td>
                      <td className="py-3 font-bold text-emerald-400">{t.symbol}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : t.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
