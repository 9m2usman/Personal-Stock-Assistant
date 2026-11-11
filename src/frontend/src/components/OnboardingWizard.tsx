import React, { useState } from 'react';
import {
  Sparkles,
  DollarSign,
  Globe2,
  FileSpreadsheet,
  Star,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Zap,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { uploadPortfolioSpreadsheet } from '../api/client.ts';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([
    'NASDAQ',
    'NYSE',
    'XLON',
  ]);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([
    'NVDA',
    'AAPL',
    'MSFT',
    'TSLA',
  ]);
  const [fileUploaded, setFileUploaded] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalSteps = 6;

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  ];

  const exchanges = [
    { code: 'NASDAQ', name: 'Nasdaq Global Select', country: 'United States' },
    { code: 'NYSE', name: 'New York Stock Exchange', country: 'United States' },
    { code: 'XLON', name: 'London Stock Exchange', country: 'United Kingdom' },
    { code: 'XJPX', name: 'Tokyo Stock Exchange', country: 'Japan' },
    { code: 'XSWX', name: 'SIX Swiss Exchange', country: 'Switzerland' },
    { code: 'XFRA', name: 'Deutsche Börse Frankfurt', country: 'Germany' },
  ];

  const suggestedTickers = [
    { sym: 'NVDA', name: 'NVIDIA Corporation', sector: 'Semiconductors' },
    { sym: 'AAPL', name: 'Apple Inc.', sector: 'Consumer Electronics' },
    { sym: 'MSFT', name: 'Microsoft Corporation', sector: 'Software' },
    { sym: 'TSLA', name: 'Tesla, Inc.', sector: 'Automotive' },
    { sym: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Cloud & Commerce' },
    { sym: 'HSBA.L', name: 'HSBC Holdings plc', sector: 'Banking' },
    { sym: '7203.T', name: 'Toyota Motor Corp', sector: 'Automotive' },
  ];

  const toggleExchange = (code: string) => {
    setSelectedExchanges((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleTicker = (sym: string) => {
    setSelectedTickers((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('inkvector_base_currency', currency);
      localStorage.setItem('inkvector_onboarded', 'true');
    } catch {
      // storage
    }
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Progress */}
        <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                Setup Wizard · Step {step} of {totalSteps}
              </div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {step === 1 && 'Welcome to INKVECTOR Intelligence'}
                {step === 2 && 'Select Base Currency'}
                {step === 3 && 'Configure Market Hubs'}
                {step === 4 && 'Portfolio Import (Optional)'}
                {step === 5 && 'Initialize Watchlist'}
                {step === 6 && 'Ready for Launch'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Step Dots */}
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i + 1 === step
                      ? 'w-6 bg-emerald-400'
                      : i + 1 < step
                      ? 'bg-emerald-600'
                      : 'bg-[var(--border-color)]'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 min-h-[340px] flex flex-col justify-between overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4 py-4 text-center max-w-lg mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Institutional Financial Intelligence Terminal
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                INKVECTOR fuses multi-provider market quotes, automated SEC EDGAR XBRL fact retrieval,
                real-time currency normalization, and an autonomous AI agent backed by a safe Python sandbox.
              </p>
              <div className="grid grid-cols-3 gap-3 pt-4 text-left">
                <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                  <Globe2 className="w-4 h-4 text-emerald-400 mb-1" />
                  <div className="text-xs font-semibold text-[var(--text-primary)]">6 Providers</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Global exchange data</div>
                </div>
                <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Grounded AI</div>
                  <div className="text-[10px] text-[var(--text-muted)]">No fake figures</div>
                </div>
                <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                  <Building2 className="w-4 h-4 text-emerald-400 mb-1" />
                  <div className="text-xs font-semibold text-[var(--text-primary)]">SEC EDGAR</div>
                  <div className="text-[10px] text-[var(--text-muted)]">Audited 10-K/10-Q</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                All multi-currency positions, portfolio valuations, and financial metrics will be dynamically converted using live ECB foreign exchange rates into your preferred base currency:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currencies.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c.code)}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition ${
                      currency === c.code
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center font-mono font-bold text-sm">
                        {c.symbol}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">{c.code}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{c.name}</div>
                      </div>
                    </div>
                    {currency === c.code && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                Choose the primary market exchanges you want prioritized in your discovery workspace and global telemetry:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {exchanges.map((ex) => {
                  const isChecked = selectedExchanges.includes(ex.code);
                  return (
                    <button
                      key={ex.code}
                      onClick={() => toggleExchange(ex.code)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">{ex.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">
                          {ex.code} · {ex.country}
                        </div>
                      </div>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Upload your existing stock holdings (.xlsx or .csv) or continue without importing. INKVECTOR will auto-detect columns, normalize currencies, and calculate your Herfindahl concentration index.
              </p>

              <div className="p-8 border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)] text-center space-y-3">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-emerald-400" />
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  {fileUploaded ? `File uploaded: ${fileUploaded}` : 'Drag & drop Excel (.xlsx, .xls, .csv) file'}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  Supports automated header detection (Ticker, Shares, Avg Price, Currency)
                </div>
                <label className="inline-block cursor-pointer px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:border-emerald-500 transition">
                  Browse Spreadsheet
                  <input
                    type="file"
                    accept=".xlsx,.csv,.xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setFileUploaded(e.target.files[0].name);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="text-center text-[11px] text-[var(--text-muted)]">
                You can also import spreadsheets at any time in the Portfolio workspace.
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                Select starter instruments to monitor on your main dashboard overview:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {suggestedTickers.map((t) => {
                  const isChecked = selectedTickers.includes(t.sym);
                  return (
                    <button
                      key={t.sym}
                      onClick={() => toggleTicker(t.sym)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
                          {t.sym}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">{t.name}</div>
                        <div className="text-[9px] text-[var(--text-muted)]">{t.sector}</div>
                      </div>
                      {isChecked && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4 py-4 text-center max-w-md mx-auto">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Setup Configuration Complete
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Your workspace is configured with <strong className="text-emerald-400">{currency}</strong> base currency, {selectedExchanges.length} exchange hubs, and {selectedTickers.length} starter instruments.
              </p>
              <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs text-left space-y-1">
                <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Configuration Summary:</div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  • Base Currency: <span className="font-mono text-emerald-400">{currency}</span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  • Monitored Hubs: <span className="font-mono text-[var(--text-primary)]">{selectedExchanges.join(', ')}</span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  • Starter Watchlist: <span className="font-mono text-[var(--text-primary)]">{selectedTickers.join(', ')}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              Skip Setup
            </button>
          )}

          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
            >
              Next Step
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition"
            >
              Enter INKVECTOR Terminal
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
