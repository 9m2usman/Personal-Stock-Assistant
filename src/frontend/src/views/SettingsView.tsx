import React, { useState } from 'react';
import {
  Settings,
  Sun,
  Moon,
  DollarSign,
  Globe2,
  ShieldCheck,
  CheckCircle2,
  Key,
  Keyboard,
  Cpu,
  Database,
  Lock,
  Zap
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [baseCurrency, setBaseCurrency] = useState(() => {
    try {
      return localStorage.getItem('inkvector_base_currency') || 'USD';
    } catch {
      return 'USD';
    }
  });

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  ];

  const handleCurrencyChange = (c: string) => {
    setBaseCurrency(c);
    try {
      localStorage.setItem('inkvector_base_currency', c);
    } catch {
      // storage
    }
  };

  const providers = [
    { name: 'SEC EDGAR (XBRL)', type: 'Audited 10-K/10-Q Regulatory Facts', status: 'Active (Native HTTP)', rate: '10 req/sec' },
    { name: 'Twelve Data', type: 'Global Real-Time & EOD Candlesticks', status: 'Online (API Key Configured)', rate: '8 credits/min' },
    { name: 'Financial Modeling Prep (FMP)', type: '3-Statement Financial Statements & Profiles', status: 'Online (API Key Configured)', rate: '300 req/day' },
    { name: 'Alpha Vantage', type: 'Fallback Quotes & Historical Bars', status: 'Online (API Key Configured)', rate: '5 req/min' },
    { name: 'NewsAPI', type: 'Financial News Feeds & Publications', status: 'Online (API Key Configured)', rate: '100 req/day' },
    { name: 'European Central Bank (ECB)', type: 'Foreign Exchange Daily Reference Spot Rates', status: 'Active (Daily XML Stream)', rate: 'Unthrottled' },
  ];

  const shortcuts = [
    { key: 'Ctrl + K', desc: 'Open Global Command Palette & Instrument Search' },
    { key: 'Esc', desc: 'Close modals, drawers, and search autocomplete' },
    { key: '↑ / ↓', desc: 'Navigate through command palette items' },
    { key: 'Enter', desc: 'Execute selected command or select stock' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Terminal Preferences
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            System Preferences & Data Integrations
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Manage UI appearance, default valuation currencies, data provider health, and keyboard shortcuts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Theme & Visual Appearance
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            INKVECTOR supports high-contrast dark fintech terminal and clean light analytical surfaces.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left flex items-center justify-between transition ${
                theme === 'dark'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5" />
                <div>
                  <div className="text-xs">Dark Fintech</div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">#0B1016</div>
                </div>
              </div>
              {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left flex items-center justify-between transition ${
                theme === 'light'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sun className="w-5 h-5" />
                <div>
                  <div className="text-xs">Light Studio</div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">#F4F7FA</div>
                </div>
              </div>
              {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Base Currency Settings */}
        <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Base Accounting Currency
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Used across portfolio valuation, asset allocation, and cross-currency holdings normalization.
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2">
            {currencies.map((c) => (
              <button
                key={c.code}
                onClick={() => handleCurrencyChange(c.code)}
                className={`p-3 rounded-xl border text-center transition ${
                  baseCurrency === c.code
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                    : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)]'
                }`}
              >
                <div className="font-mono text-sm">{c.symbol}</div>
                <div className="text-xs font-bold font-mono mt-0.5">{c.code}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verified Data Providers Table */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Configured Data Provider Pipelines
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            6 Official Market Sources Connected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono">
                <th className="pb-3">Provider / Authority</th>
                <th className="pb-3">Data Domain</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Throughput Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
              {providers.map((p, idx) => (
                <tr key={idx} className="hover:bg-[var(--bg-card)]/50 transition">
                  <td className="py-3 font-bold text-[var(--text-primary)]">{p.name}</td>
                  <td className="py-3 text-[var(--text-secondary)] font-sans">{p.type}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 text-right text-[var(--text-muted)]">{p.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] flex items-start gap-2">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            API secret tokens are securely encrypted in backend environment configuration (<code className="text-emerald-400 font-mono">.env</code>) and are never exposed across client network responses.
          </span>
        </div>
      </div>

      {/* Keyboard Shortcuts Overview */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Keyboard Shortcuts & Navigation
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between text-xs"
            >
              <span className="text-[var(--text-secondary)]">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)] font-mono text-emerald-400 font-bold text-[11px]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
