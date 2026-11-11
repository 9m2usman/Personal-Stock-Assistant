import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Search,
  Plus,
  X,
  TrendingUp,
  Building2,
  DollarSign,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { fetchFundamentals, fetchQuote, searchInstruments, NormalizedInstrument } from '../api/client.ts';

interface ResearchWorkspaceProps {
  onSelectSymbol: (symbol: string) => void;
  onNavigate: (tabId: string) => void;
}

export const ResearchWorkspace: React.FC<ResearchWorkspaceProps> = ({
  onSelectSymbol,
  onNavigate,
}) => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['NVDA', 'AAPL', 'MSFT']);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NormalizedInstrument[]>([]);
  const [companyData, setCompanyData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComparisonData(selectedSymbols);
  }, [selectedSymbols]);

  const loadComparisonData = async (symbols: string[]) => {
    setLoading(true);
    const dataMap: Record<string, any> = {};
    await Promise.all(
      symbols.map(async (sym) => {
        try {
          const [fund, quote] = await Promise.allSettled([
            fetchFundamentals(sym),
            fetchQuote(sym),
          ]);
          dataMap[sym] = {
            fundamentals: fund.status === 'fulfilled' ? fund.value : null,
            quote: quote.status === 'fulfilled' ? quote.value : null,
          };
        } catch (e) {
          console.error(e);
        }
      })
    );
    setCompanyData(dataMap);
    setLoading(false);
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await searchInstruments(val.trim(), undefined, 5);
      setSearchResults(res);
    } catch {
      setSearchResults([]);
    }
  };

  const handleAddSymbol = (sym: string) => {
    if (!selectedSymbols.includes(sym) && selectedSymbols.length < 5) {
      setSelectedSymbols([...selectedSymbols, sym]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveSymbol = (sym: string) => {
    if (selectedSymbols.length > 1) {
      setSelectedSymbols(selectedSymbols.filter((s) => s !== sym));
    }
  };

  // Prepare chart comparison data
  const chartData = selectedSymbols.map((sym) => {
    const item = companyData[sym];
    const profile = item?.fundamentals?.profile;
    const ratios = item?.fundamentals?.ratios;
    const income = item?.fundamentals?.latest_income_statement;

    return {
      name: sym,
      peRatio: ratios?.pe_ratio || 0,
      roePercent: ratios?.roe ? Number((ratios.roe * 100).toFixed(1)) : 0,
      grossMarginPercent: ratios?.gross_margin ? Number((ratios.gross_margin * 100).toFixed(1)) : 0,
      revenueBillion: income?.total_revenue ? Number((income.total_revenue / 1e9).toFixed(1)) : 0,
    };
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Cross-Asset Comparative Analysis
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Company Comparison & Peer Valuation Studio
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Benchmark financial ratios, audited SEC revenue, margins, and valuation multiples side-by-side.
          </p>
        </div>

        {/* Search & Add Peer */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value.toUpperCase())}
            placeholder="Add ticker to compare..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono transition"
          />

          {searchResults.length > 0 && (
            <div className="absolute top-11 left-0 right-0 z-20 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2 shadow-2xl space-y-1">
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  onClick={() => handleAddSymbol(res.display_symbol)}
                  className="w-full p-2 text-left text-xs rounded-lg hover:bg-[var(--bg-elevated)] flex items-center justify-between"
                >
                  <span className="font-mono font-bold text-emerald-400">{res.display_symbol}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] truncate max-w-[120px]">
                    {res.company_name}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Peer Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[var(--text-muted)]">Active Comparison:</span>
        {selectedSymbols.map((sym) => (
          <span
            key={sym}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold"
          >
            {sym}
            {selectedSymbols.length > 1 && (
              <button
                onClick={() => handleRemoveSymbol(sym)}
                className="hover:text-rose-400 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Comparative Visual Chart */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3">
        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Comparative Margin & Profitability Metrics (%)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="grossMarginPercent" name="Gross Margin %" fill="#20c997" radius={[4, 4, 0, 0]} />
              <Bar dataKey="roePercent" name="Return on Equity %" fill="#69a8f5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peer Comparison Matrix Table */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-x-auto space-y-3">
        <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
          Financial Fact & Ratio Matrix
        </h3>

        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono">
              <th className="pb-3">Financial Metric</th>
              {selectedSymbols.map((sym) => (
                <th key={sym} className="pb-3 text-right">
                  <button
                    onClick={() => {
                      onSelectSymbol(sym);
                      onNavigate('stock_detail');
                    }}
                    className="font-bold text-emerald-400 hover:underline flex items-center justify-end gap-1 font-mono"
                  >
                    {sym} <ArrowRight className="w-3 h-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] font-mono tabular-nums">
            <tr>
              <td className="py-3 text-[var(--text-primary)] font-medium">Market Capitalization</td>
              {selectedSymbols.map((sym) => {
                const cap = companyData[sym]?.fundamentals?.profile?.market_cap;
                return (
                  <td key={sym} className="py-3 text-right font-bold text-[var(--text-primary)]">
                    {cap != null && !isNaN(Number(cap)) ? `$${(Number(cap) / 1e9).toFixed(2)}B` : '—'}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="py-3 text-[var(--text-primary)] font-medium">Price-to-Earnings (P/E)</td>
              {selectedSymbols.map((sym) => {
                const pe = companyData[sym]?.fundamentals?.ratios?.pe_ratio;
                return (
                  <td key={sym} className="py-3 text-right font-bold text-emerald-400">
                    {pe != null && !isNaN(Number(pe)) ? Number(pe).toFixed(2) : '—'}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="py-3 text-[var(--text-primary)] font-medium">Annual Revenue</td>
              {selectedSymbols.map((sym) => {
                const rev = companyData[sym]?.fundamentals?.latest_income_statement?.total_revenue;
                return (
                  <td key={sym} className="py-3 text-right font-bold">
                    {rev != null && !isNaN(Number(rev)) ? `$${(Number(rev) / 1e9).toFixed(2)}B` : '—'}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="py-3 text-[var(--text-primary)] font-medium">Gross Profit Margin</td>
              {selectedSymbols.map((sym) => {
                const gm = companyData[sym]?.fundamentals?.ratios?.gross_margin;
                return (
                  <td key={sym} className="py-3 text-right text-emerald-400 font-bold">
                    {gm != null && !isNaN(Number(gm)) ? `${(Number(gm) * 100).toFixed(1)}%` : '—'}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="py-3 text-[var(--text-primary)] font-medium">Net Profit Margin</td>
              {selectedSymbols.map((sym) => {
                const nm = companyData[sym]?.fundamentals?.ratios?.net_margin;
                return (
                  <td key={sym} className="py-3 text-right font-bold">
                    {nm != null && !isNaN(Number(nm)) ? `${(Number(nm) * 100).toFixed(1)}%` : '—'}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="py-3 text-[var(--text-primary)] font-medium">Debt-to-Equity Ratio</td>
              {selectedSymbols.map((sym) => {
                const de = companyData[sym]?.fundamentals?.ratios?.debt_to_equity;
                return (
                  <td key={sym} className="py-3 text-right text-[var(--text-secondary)]">
                    {de != null && !isNaN(Number(de)) ? Number(de).toFixed(2) : '—'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
