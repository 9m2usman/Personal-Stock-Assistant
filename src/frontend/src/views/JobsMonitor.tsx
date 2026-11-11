import React, { useState } from 'react';
import { Cpu, Play, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { enqueueResearchJob, pollJobStatus } from '../api/client.ts';

export const JobsMonitor: React.FC = () => {
  const [symbol, setSymbol] = useState('NVDA');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [polling, setPolling] = useState(false);

  const startResearchJob = async () => {
    try {
      setPolling(true);
      const res = await enqueueResearchJob(symbol);
      setActiveJobId(res.task_id);
      setJobStatus(res);

      // Poll until finished
      const interval = setInterval(async () => {
        try {
          const statusRes = await pollJobStatus(res.task_id);
          setJobStatus(statusRes);
          if (statusRes.ready) {
            clearInterval(interval);
            setPolling(false);
          }
        } catch {
          clearInterval(interval);
          setPolling(false);
        }
      }, 1500);
    } catch (e) {
      console.error(e);
      setPolling(false);
    }
  };

  const result = jobStatus?.result;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            Asynchronous Task Worker Monitor
          </h1>
          <p className="text-xs text-slate-400">Celery distributed queue • Deep equity research generation • Long-running jobs</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol"
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 w-24 font-bold text-center focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={startResearchJob}
            disabled={polling}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Launch Deep Research Dossier
          </button>
        </div>
      </div>

      {/* Active Task Card */}
      {jobStatus && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-xs text-slate-400">Task ID:</span>
              <div className="text-xs font-mono text-slate-200">{jobStatus.task_id}</div>
            </div>

            <div className="flex items-center gap-2">
              {polling && <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />}
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  jobStatus.ready
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                }`}
              >
                {jobStatus.status}
              </span>
            </div>
          </div>

          {/* Render Result if Ready */}
          {result && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Deep Research Memo Compiled for {result.symbol}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Company / Exchange</span>
                  <span className="font-semibold text-slate-200">{result.company_name} ({result.exchange})</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Market Price</span>
                  <span className="font-semibold text-emerald-400">${result.market_price}</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">P/E Valuation</span>
                  <span className="font-semibold text-slate-200">{result.valuation_ratios?.pe_ratio ?? 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">RSI (14-Day)</span>
                  <span className="font-semibold text-slate-200">{result.technical_summary?.rsi_14 ?? 'N/A'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
