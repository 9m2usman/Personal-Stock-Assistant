import React, { useState, useEffect } from 'react';
import {
  Star,
  Plus,
  Trash2,
  Search,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building2,
  Activity,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { fetchWatchlist, searchInstruments, WatchlistItem, NormalizedInstrument } from '../api/client.ts';

interface WatchlistsWorkspaceProps {
  onSelectSymbol: (symbol: string) => void;
  onNavigate: (tabId: string) => void;
}

export const WatchlistsWorkspace: React.FC<WatchlistsWorkspaceProps> = ({
  onSelectSymbol,
  onNavigate,
}) => {
  const [lists, setLists] = useState<Record<string, WatchlistItem[]>>({
    'Institutional Core': [],
    'Semiconductors & AI': [],
    'Global Financials': [],
  });
  const [activeListName, setActiveListName] = useState<string>('Institutional Core');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NormalizedInstrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      const data = await fetchWatchlist();
      setLists((prev) => ({
        ...prev,
        'Institutional Core': data,
        'Semiconductors & AI': data.filter((d) => ['NVDA', 'MSFT', 'AAPL', 'TSLA'].includes(d.symbol)),
        'Global Financials': data.filter((d) => ['HSBA.L', '7203.T'].includes(d.symbol)),
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await searchInstruments(val.trim(), undefined, 6);
      setSearchResults(res);
    } catch {
      setSearchResults([]);
    }
  };

  const handleAddStock = (inst: NormalizedInstrument) => {
    const newItem: WatchlistItem = {
      symbol: inst.display_symbol,
      company_name: inst.company_name,
      exchange: inst.exchange_name,
      currency: inst.currency,
      price: null,
      change: null,
      change_percent: null,
      as_of: new Date().toISOString(),
      freshness: 'RECENT',
      provider: 'ROUTER',
      is_adr: inst.is_adr,
    };

    setLists((prev) => ({
      ...prev,
      [activeListName]: [...(prev[activeListName] || []), newItem],
    }));
    setSearchQuery('');
    setSearchResults([]);
    setAdding(false);
  };

  const handleRemove = (symbol: string) => {
    setLists((prev) => ({
      ...prev,
      [activeListName]: prev[activeListName].filter((i) => i.symbol !== symbol),
    }));
  };

  const currentItems = lists[activeListName] || [];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Multi-Asset Monitoring
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <Star className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
            Watchlists & Priority Portfolios
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Create custom lists, monitor live price changes, and inspect multi-exchange quotes.
          </p>
        </div>

        <button
          onClick={() => setAdding(!adding)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          Add Instrument
        </button>
      </div>

      {/* List Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--border-color)]">
        {Object.keys(lists).map((name) => (
          <button
            key={name}
            onClick={() => setActiveListName(name)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeListName === name
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            {name} ({lists[name]?.length || 0})
          </button>
        ))}
      </div>

      {/* Add Stock Autocomplete Drawer */}
      {adding && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[var(--text-primary)]">
              Search and add to "{activeListName}"
            </div>
            <button
              onClick={() => setAdding(false)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value.toUpperCase())}
              placeholder="Search ticker or company name..."
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddStock(item)}
                  className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-emerald-500 text-left flex items-center justify-between text-xs transition"
                >
                  <div>
                    <span className="font-mono font-bold text-emerald-400">{item.display_symbol}</span>{' '}
                    <span className="text-[var(--text-secondary)] truncate">{item.company_name}</span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watchlist Table */}
      <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-x-auto shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            Retrieving real-time quotes for watchlist instruments...
          </div>
        ) : currentItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            No instruments in this watchlist. Click "Add Instrument" above to track securities.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono">
                <th className="pb-3">Symbol / Company</th>
                <th className="pb-3">Exchange</th>
                <th className="pb-3 text-right">Price</th>
                <th className="pb-3 text-right">Daily Change</th>
                <th className="pb-3 text-right">Freshness</th>
                <th className="pb-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-mono tabular-nums">
              {currentItems.map((item) => {
                const isPos = (item.change || 0) >= 0;
                return (
                  <tr key={item.symbol} className="hover:bg-[var(--bg-card)]/50 transition">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onSelectSymbol(item.symbol);
                            onNavigate('stock_detail');
                          }}
                          className="font-bold text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          {item.symbol}
                        </button>
                        <span className="text-[11px] text-[var(--text-secondary)] font-sans truncate max-w-[180px]">
                          {item.company_name}
                        </span>
                        {item.is_adr && (
                          <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-400">
                            ADR
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 text-[var(--text-secondary)]">
                      {item.exchange}
                    </td>

                    <td className="py-3 text-right font-bold text-[var(--text-primary)]">
                      {item.price !== null && item.price !== undefined
                        ? `$${item.price.toFixed(2)}`
                        : '—'}
                    </td>

                    <td className="py-3 text-right font-bold">
                      <span className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
                        {item.change_percent !== null && item.change_percent !== undefined
                          ? `${isPos ? '+' : ''}${item.change_percent.toFixed(2)}%`
                          : '—'}
                      </span>
                    </td>

                    <td className="py-3 text-right text-[var(--text-muted)] text-[10px]">
                      {item.freshness || 'LIVE'}
                    </td>

                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            onSelectSymbol(item.symbol);
                            onNavigate('stock_detail');
                          }}
                          className="p-1 rounded hover:bg-[var(--bg-elevated)] text-emerald-400"
                          title="Open Workspace"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemove(item.symbol)}
                          className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-rose-400 transition"
                          title="Remove from list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
