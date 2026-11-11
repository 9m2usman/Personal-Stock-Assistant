import React, { useState, useEffect } from 'react';
import { Search, Building2, DollarSign, BarChart3, FileText, CheckCircle2 } from 'lucide-react';
import { fetchFundamentals, fetchQuote } from '../api/client.ts';
import { MetricCard } from '../components/MetricCard.tsx';

interface MarketResearchProps {
  initialSymbol?: string;
}

export const MarketResearch: React.FC<MarketResearchProps> = ({ initialSymbol = 'NVDA' }) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [query, setQuery] = useState(initialSymbol);
  const [data, setData] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'income' | 'balance' | 'cash'>('income');

  useEffect(() => {
    loadData(symbol);
  }, [symbol]);

  const loadData = async (sym: string) => {
    if (!sym) return;
    setLoading(true);
    try {
      const [fundRes, quoteRes] = await Promise.allSettled([
        fetchFundamentals(sym),
        fetchQuote(sym)
      ]);

      if (fundRes.status === 'fulfilled') setData(fundRes.value);
      if (quoteRes.status === 'fulfilled') setQuote(quoteRes.value);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSymbol(query.trim().toUpperCase());
    }
  };

  const profile = data?.profile || {};
  const ratios = data?.ratios || {};
  const income = data?.latest_income_statement;
  const balance = data?.latest_balance_sheet;
  const cashflow = data?.latest_cash_flow;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            Stock & Enterprise Research
          </h1>
          <p className="text-xs text-slate-400">Official regulatory SEC EDGAR XBRL facts and FMP stable 3-statement financials</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Search ticker (e.g. NVDA, MSFT)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-medium rounded-lg text-sm transition"
          >
            Analyze
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-400 text-sm">
          Loading institutional fundamentals for {symbol}...
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          {/* Company Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-100">{profile.company_name || symbol}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                    {symbol}
                  </span>
                  <span className="text-xs text-slate-400">{profile.exchange}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Sector: <span className="text-slate-200 font-medium">{profile.sector || 'N/A'}</span> • Industry: <span className="text-slate-200 font-medium">{profile.industry || 'N/A'}</span>
                </div>
              </div>

              {quote && (
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-slate-100">
                    {quote.currency} {quote.price}
                  </div>
                  <div className={`text-xs font-semibold ${Number(quote.change) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {quote.change} ({quote.change_percent}%)
                  </div>
                </div>
              )}
            </div>

            {profile.description && (
              <p className="mt-4 text-xs text-slate-400 leading-relaxed max-w-4xl border-t border-slate-800/80 pt-3">
                {profile.description}
              </p>
            )}
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard
              title="P/E Ratio"
              value={ratios.pe_ratio ?? 'N/A'}
              subtitle="TTM Valuation"
            />
            <MetricCard
              title="Gross Margin"
              value={ratios.gross_margin_percent ? `${ratios.gross_margin_percent}%` : 'N/A'}
              subtitle="Profitability"
            />
            <MetricCard
              title="Net Margin"
              value={ratios.net_margin_percent ? `${ratios.net_margin_percent}%` : 'N/A'}
              subtitle="Net Conversion"
            />
            <MetricCard
              title="Return on Equity"
              value={ratios.return_on_equity_percent ? `${ratios.return_on_equity_percent}%` : 'N/A'}
              subtitle="ROE"
            />
            <MetricCard
              title="Debt to Equity"
              value={ratios.debt_to_equity_ratio ?? 'N/A'}
              subtitle="Leverage"
            />
            <MetricCard
              title="Free Cash Flow"
              value={ratios.free_cash_flow ? `$${(ratios.free_cash_flow / 1e9).toFixed(1)}B` : 'N/A'}
              subtitle="FCF Generated"
            />
          </div>

          {/* 3-Statement Financial Tables */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Audited Financial Statements</span>
              </div>
              <div className="flex gap-2">
                {(['income', 'balance', 'cash'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                      activeTab === tab
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {tab === 'income' ? 'Income Statement' : tab === 'balance' ? 'Balance Sheet' : 'Cash Flow'}
                  </button>
                ))}
              </div>
            </div>

            {/* Statement Table Content */}
            <div className="overflow-x-auto text-xs">
              {activeTab === 'income' && income && (
                <table className="w-full text-left">
                  <thead className="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2">Metric</th>
                      <th className="py-2 text-right">Fiscal Year {income.fiscal_year}</th>
                      <th className="py-2 text-right">Reported Currency</th>
                      <th className="py-2 text-right">Filing Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-2 font-medium">Total Revenue</td>
                      <td className="py-2 text-right font-semibold text-emerald-400">
                        ${Number(income.metrics?.revenue || 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">{income.reported_currency}</td>
                      <td className="py-2 text-right">{income.filing_date}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Gross Profit</td>
                      <td className="py-2 text-right font-semibold">
                        ${Number(income.metrics?.grossProfit || 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">{income.reported_currency}</td>
                      <td className="py-2 text-right">{income.filing_date}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Net Income</td>
                      <td className="py-2 text-right font-semibold text-emerald-400">
                        ${Number(income.metrics?.netIncome || 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">{income.reported_currency}</td>
                      <td className="py-2 text-right">{income.filing_date}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Diluted EPS</td>
                      <td className="py-2 text-right font-semibold">
                        ${Number(income.metrics?.eps || 0).toFixed(2)}
                      </td>
                      <td className="py-2 text-right">{income.reported_currency}</td>
                      <td className="py-2 text-right">{income.filing_date}</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {activeTab === 'balance' && balance && (
                <table className="w-full text-left">
                  <thead className="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2">Balance Sheet Item</th>
                      <th className="py-2 text-right">Reported Value</th>
                      <th className="py-2 text-right">Filing Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-2 font-medium">Total Assets</td>
                      <td className="py-2 text-right font-semibold text-emerald-400">
                        ${Number(balance.metrics?.totalAssets || 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">{balance.filing_date}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Total Stockholder Equity</td>
                      <td className="py-2 text-right font-semibold">
                        ${Number(balance.metrics?.totalStockholdersEquity || 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">{balance.filing_date}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Total Debt</td>
                      <td className="py-2 text-right font-semibold text-rose-400">
                        ${Number(balance.metrics?.totalDebt || 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">{balance.filing_date}</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {activeTab === 'cash' && cashflow && (
                <table className="w-full text-left">
                  <thead className="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2">Cash Flow Item</th>
                      <th className="py-2 text-right">Reported Value</th>
                      <th className="py-2 text-right">Filing Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-2 font-medium">Operating Cash Flow</td>
                      <td className="py-2 text-right font-semibold text-emerald-400">
                        ${Number(cashflow.metrics?.netCashProvidedByOperatingActivities || 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">{cashflow.filing_date}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Capital Expenditure</td>
                      <td className="py-2 text-right font-semibold text-rose-400">
                        ${Number(cashflow.metrics?.capitalExpenditure || 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">{cashflow.filing_date}</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Free Cash Flow</td>
                      <td className="py-2 text-right font-semibold text-emerald-400">
                        ${Number(cashflow.metrics?.freeCashFlow || 0).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">{cashflow.filing_date}</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {!income && !balance && !cashflow && (
                <div className="py-8 text-center text-slate-500">
                  No 3-statement filings available for {symbol}. SEC filings may be pending.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
