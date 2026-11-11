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
  ChevronLeft,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Database,
  Layers,
  Activity,
  ShieldCheck
} from 'lucide-react';
import {
  fetchPaginatedInstruments,
  fetchCatalogStats,
  triggerCatalogSync,
  NormalizedInstrument,
  CatalogueStatistics,
  fetchWatchlist,
  WatchlistItem
} from '../api/client.ts';
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
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 18;

  const [instruments, setInstruments] = useState<NormalizedInstrument[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<CatalogueStatistics | null>(null);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial statistics and first page
  useEffect(() => {
    loadStats();
    loadPage(1, searchQuery, exchangeFilter, countryFilter, typeFilter);
  }, []);

  const loadStats = async () => {
    try {
      const s = await fetchCatalogStats();
      setStats(s);
    } catch (e) {
      console.error('Failed to load catalogue stats', e);
    }
  };

  const loadPage = async (
    targetPage: number,
    query: string = searchQuery,
    exch: string = exchangeFilter,
    country: string = countryFilter,
    type: string = typeFilter
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPaginatedInstruments({
        query: query.trim(),
        exchange: exch,
        country: country,
        asset_type: type,
        page: targetPage,
        page_size: pageSize,
      });
      setInstruments(res.items || []);
      setTotalItems(res.total || 0);
      setPage(res.page || targetPage);
      setTotalPages(res.total_pages || Math.max(1, Math.ceil((res.total || 0) / pageSize)));
    } catch (err: any) {
      setError(err.message || 'Failed to load instruments');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPage(1, searchQuery, exchangeFilter, countryFilter, typeFilter);
  };

  const handleExchangeChange = (exch: string) => {
    setExchangeFilter(exch);
    setPage(1);
    loadPage(1, searchQuery, exch, countryFilter, typeFilter);
  };

  const handleCountryChange = (c: string) => {
    setCountryFilter(c);
    setPage(1);
    loadPage(1, searchQuery, exchangeFilter, c, typeFilter);
  };

  const handleTypeChange = (t: string) => {
    setTypeFilter(t);
    setPage(1);
    loadPage(1, searchQuery, exchangeFilter, countryFilter, t);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    loadPage(newPage, searchQuery, exchangeFilter, countryFilter, typeFilter);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  const handleSyncSEC = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await triggerCatalogSync('sec_edgar');
      const count = res?.new_instruments_ingested != null ? Number(res.new_instruments_ingested).toLocaleString() : '0';
      setSyncMessage(`Successfully synchronized ${count} SEC EDGAR corporate equities!`);
      await loadStats();
      await loadPage(1, searchQuery, exchangeFilter, countryFilter, typeFilter);
    } catch (err: any) {
      setSyncMessage(`Sync warning: ${err.message || 'Network limitation'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSelect = (symbol: string) => {
    onSelectSymbol(symbol);
    onNavigate('stock_detail');
  };

  const exchangeTabs = [
    { id: 'ALL', label: 'All Exchanges' },
    { id: 'NASDAQ', label: 'NASDAQ' },
    { id: 'NYSE', label: 'NYSE' },
    { id: 'XLON', label: 'London (LSE)' },
    { id: 'XJPX', label: 'Tokyo (TSE)' },
    { id: 'XSWX', label: 'Swiss (SIX)' },
    { id: 'XFRA', label: 'Frankfurt (FWB)' },
  ];

  const countries = [
    { id: 'ALL', label: 'All Jurisdictions' },
    { id: 'United States', label: 'United States (US)' },
    { id: 'United Kingdom', label: 'United Kingdom (UK)' },
    { id: 'Japan', label: 'Japan (JP)' },
    { id: 'Switzerland', label: 'Switzerland (CH)' },
    { id: 'Germany', label: 'Germany (DE)' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* 3D Global Telemetry Hub */}
      <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-card)]">
        <GlobalMarketGlobe3D />
      </div>

      {/* Institutional Universe Metric Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
            <span>UNIVERSE COVERAGE</span>
            <Database className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] font-mono mt-1">
            {stats?.total_instruments != null ? Number(stats.total_instruments).toLocaleString() : '10,400+'}
          </div>
          <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">
            SEC EDGAR + Global Leaders
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
            <span>ACTIVE EXCHANGES</span>
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] font-mono mt-1">
            {stats?.total_exchanges != null ? stats.total_exchanges : 6}
          </div>
          <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5">
            US, UK, Japan, Swiss, EU
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
            <span>PRIMARY EQUITIES</span>
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] font-mono mt-1">
            {stats?.primary_listings != null ? Number(stats.primary_listings).toLocaleString() : '10,380+'}
          </div>
          <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">
            Ordinary common shares
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
            <span>DUAL-LISTED ADRs</span>
            <Layers className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] font-mono mt-1">
            {stats?.adr_listings != null ? Number(stats.adr_listings).toLocaleString() : '20+'}
          </div>
          <div className="text-[10px] text-purple-400/80 font-mono mt-0.5">
            American Depositary Receipts
          </div>
        </div>
      </div>

      {/* Header & Mission & Sync Action */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Institutional Discovery
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              Real-Time Normalized Catalog
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <Globe2 className="w-6 h-6 text-emerald-400" />
            Global Financial Instrument Universe
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Explore 10,000+ public equities, primary international listings, and cross-border ADRs across verified financial hubs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncSEC}
            disabled={syncing}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            title="Pulls authoritative company registries from official SEC EDGAR endpoint"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing SEC Registry...' : 'Sync SEC Universe'}
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Search Bar & Multi-Dimensional Filters */}
      <div className="space-y-3 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        {/* Search Row */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by symbol, company name, or CIK (e.g. NVDA, Apple, HSBA, 7203, Nestle)..."
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono transition"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition shadow-sm"
          >
            Search
          </button>
        </form>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-[var(--border-subtle)]">
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

          {/* Secondary Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Country Selector */}
            <select
              value={countryFilter}
              onChange={(e) => handleCountryChange(e.target.value)}
              aria-label="Filter by jurisdiction"
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono"
            >
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Listing Type Switcher */}
            <div className="flex items-center gap-1 border border-[var(--border-color)] rounded-lg p-0.5 bg-[var(--bg-card)]">
              <button
                onClick={() => handleTypeChange('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  typeFilter === 'ALL'
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => handleTypeChange('Common Stock')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  typeFilter === 'Common Stock'
                    ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Primary
              </button>
              <button
                onClick={() => handleTypeChange('ADR')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  typeFilter === 'ADR'
                    ? 'bg-amber-500/20 text-amber-400 font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                ADRs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination Status Bar */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
        <div>
          Showing{' '}
          <span className="font-mono text-[var(--text-primary)] font-bold">
            {totalItems === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>
          {' '}-{' '}
          <span className="font-mono text-[var(--text-primary)] font-bold">
            {Math.min(page * pageSize, totalItems)}
          </span>
          {' '}of{' '}
          <span className="font-mono text-[var(--text-primary)] font-bold">
            {totalItems.toLocaleString()}
          </span>{' '}
          registered instruments
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] disabled:opacity-30 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs">
              Page <span className="font-bold text-[var(--text-primary)]">{page}</span> of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] disabled:opacity-30 transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="py-24 text-center text-xs text-[var(--text-muted)] space-y-2">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-emerald-400" />
          <div>Resolving global instruments across registered market exchanges...</div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {instruments.map((item) => (
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
                      {item.exchange_name || item.exchange_mic}
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

                {/* Data Capabilities Pills */}
                <div className="flex flex-wrap items-center gap-1 mt-3">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Quotes
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                    History
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                    Fundamentals
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                    News
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    Technicals
                  </span>
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

      {instruments.length === 0 && !loading && (
        <div className="py-20 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-8">
          <Database className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
          <div className="font-bold text-[var(--text-primary)]">No matching instruments found</div>
          <div className="mt-1">
            Try adjusting your query, exchange filter, or click "Sync SEC Universe" to ingest latest global listings.
          </div>
        </div>
      )}

      {/* Bottom Pagination Controls */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] disabled:opacity-30 text-xs font-semibold transition flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="font-mono text-xs px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] disabled:opacity-30 text-xs font-semibold transition flex items-center gap-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};