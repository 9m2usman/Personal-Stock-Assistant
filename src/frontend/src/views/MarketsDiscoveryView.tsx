import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe2,
  Building2,
  Filter,
  ArrowRight,
  TrendingUp,
  Tag,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { searchInstruments, NormalizedInstrument, fetchWatchlist, WatchlistItem } from '../api/client.ts';
import { GlobalMarketGlobe3D } from '../components/GlobalMarketGlobe3D.tsx';

interface MarketsDiscoveryViewProps {
  onSelectSymbol: (symbol: string) => void;
  onNavigate: (tabId: string) => void;
}

export const MarketsDiscoveryView: React.FC<MarketsDiscoveryViewProps> = ({
  onSelectSymbol,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [results, setResults] = useState<NormalizedInstrument[]>([]);
  const [popularInstruments, setPopularInstruments] = useState<NormalizedInstrument[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial universe
  useEffect(() => {
    loadInitialUniverse();
  }, []);

  const loadInitialUniverse = async () => {
    setLoading(true);
    try {
      const [allInst, wl] = await Promise.all([
        searchInstruments('', undefined, 30),
        fetchWatchlist().catch(() => []),
      ]);
      setPopularInstruments(allInst);
      setResults(allInst);
      setWatchlist(wl);
    } catch (err: any) {
      setError(err.message || 'Failed to load instruments');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (val: string, exch: string = exchangeFilter) => {
    setSearchQuery(val);
    setLoading(true);
    setError(null);
    try {
      const exParam = exch === 'ALL' ? undefined : exch;
      const res = await searchInstruments(val.trim(), exParam, 30);
      setResults(res);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeChange = (exch: string) => {
    setExchangeFilter(exch);
    handleSearch(searchQuery, exch);
  };

  const filteredResults = results.filter((item) => {
    if (typeFilter === 'ADR') return item.is_adr;
    if (typeFilter === 'PRIMARY') return !item.is_adr;
    return true;
  });

  const handleSelect = (symbol: string) => {
    onSelectSymbol(symbol);
    onNavigate('stock_detail');
  };

  const exchangeTabs = [
    { id: 'ALL', label: 'All Global Exchanges' },
    { id: 'NASDAQ', label: 'NASDAQ' },
    { id: 'NYSE', label: 'NYSE' },
    { id: 'XLON', label: 'London (LSE)' },
    { id: 'XJPX', label: 'Tokyo (TSE)' },
    { id: 'XSWX', label: 'Swiss (SIX)' },
    { id: 'XFRA', label: 'Frankfurt (FWB)' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* 3D Global Telemetry Hub */}
      <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-card)]">
        <GlobalMarketGlobe3D />
      </div>

      {/* Header & Mission */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Institutional Discovery
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-emerald-400" />
            Global Markets & Instrument Directory
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Explore equities, primary international listings, and ADRs across global financial hubs.
          </p>
        </div>

        {/* Search Bar Input */}
        <div className="w-full md:w-80">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value.toUpperCase())}
              placeholder="Search ticker, company, exchange..."
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono transition"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Listing Type Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs">
        {/* Exchange Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {exchangeTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleExchangeChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                exchangeFilter === tab.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Listing Type Filter */}
        <div className="flex items-center gap-1.5 border-l border-[var(--border-color)] pl-3">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              typeFilter === 'ALL'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('PRIMARY')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              typeFilter === 'PRIMARY'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            Primary
          </button>
          <button
            onClick={() => setTypeFilter('ADR')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              typeFilter === 'ADR'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            ADRs
          </button>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[var(--text-muted)]">
          Resolving global instruments across registered market exchanges...
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResults.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item.display_symbol)}
              className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-emerald-500/50 hover:shadow-lg transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-extrabold text-sm text-emerald-400 group-hover:text-emerald-300">
                      {item.display_symbol}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] font-mono text-[var(--text-secondary)]">
                      {item.exchange_name}
                    </span>
                  </div>

                  {item.is_adr ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono font-bold">
                      ADR
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                      Primary
                    </span>
                  )}
                </div>

                <div className="text-xs font-bold text-[var(--text-primary)] mt-2 line-clamp-1">
                  {item.company_name}
                </div>

                <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  {item.country} · Currency: {item.currency}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span className="font-mono">MIC: {item.exchange_mic}</span>
                <span className="text-emerald-400 group-hover:translate-x-1 flex items-center gap-1 font-semibold transition">
                  Open Workspace <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredResults.length === 0 && !loading && (
        <div className="py-16 text-center text-xs text-[var(--text-muted)]">
          No instruments matched your search criteria. Try searching by company name or ticker (e.g. Apple, NVDA, HSBA).
        </div>
      )}
    </div>
  );
};
