import React, { useEffect, useState } from 'react';
import { X, RefreshCw, TrendingUp, TrendingDown, Star, Globe, ShieldCheck, AlertCircle } from 'lucide-react';
import { fetchWatchlist, WatchlistItem, searchInstruments, NormalizedInstrument } from '../api/client.ts';
import { formatRatio, formatChange } from '../utils/financial.ts';

interface WatchlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const WatchlistDrawer: React.FC<WatchlistDrawerProps> = ({
  isOpen,
  onClose,
  selectedSymbol,
  onSelectSymbol,
}) => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NormalizedInstrument[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadWatchlist();
    }
  }, [isOpen]);

  const loadWatchlist = async () => {
    setLoading(true);
    try {
      const data = await fetchWatchlist();
      setItems(data);
    } catch (e) {
      console.error('Failed to load watchlist:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchInstruments(q.trim(), undefined, 6);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSymbol = (sym: string) => {
    onSelectSymbol(sym);
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Star className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Institutional Watchlist</h2>
              <p className="text-[10px] text-slate-400">Empirical market prices & multi-exchange quotes</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadWatchlist}
              disabled={loading}
              title="Refresh Watchlist"
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Add / Search Filter */}
        <div className="p-3 border-b border-slate-800 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value.toUpperCase())}
            placeholder="Search & add symbol (e.g. AAPL, HSBA.L, TM)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          />

          {/* Quick Search Autocomplete Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-12 left-3 right-3 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-20 overflow-hidden divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  onClick={() => handleAddSymbol(res.display_symbol)}
                  className="w-full p-2.5 text-left flex items-center justify-between hover:bg-slate-900 transition"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-slate-100">{res.display_symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium">
                        {res.exchange_name}
                      </span>
                      {res.is_adr && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/40">
                          ADR
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{res.company_name}</div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">Select →</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && items.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-500">
              Loading real-time institutional quotes...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-500">
              Watchlist is empty. Search a symbol above to add.
            </div>
          )}

          {items.map((item) => {
            const isSelected = selectedSymbol === item.symbol;
            const hasPrice = item.price !== null && item.price !== undefined;
            const isUp = (item.change ?? 0) >= 0;

            return (
              <div
                key={item.symbol}
                onClick={() => {
                  onSelectSymbol(item.symbol);
                  onClose();
                }}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg'
                    : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                {/* Left: Info */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-extrabold text-xs text-slate-100">{item.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {item.exchange}
                    </span>
                    {item.is_adr && (
                      <span className="text-[10px] px-1 rounded bg-amber-950/80 text-amber-400 border border-amber-800/40">
                        ADR
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 max-w-[190px] truncate">
                    {item.company_name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <span>Source: {item.provider}</span>
                    <span>•</span>
                    <span className="text-slate-400">{item.freshness}</span>
                  </div>
                </div>

                {/* Right: Price & Change */}
                <div className="text-right font-mono">
                  {hasPrice ? (
                    <>
                      <div className="text-xs font-bold text-slate-100">
                        {item.currency} {formatRatio(item.price, 2)}
                      </div>
                      <div
                        className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${
                          isUp ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>
                          {formatChange(item.change, item.change_percent)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-amber-400/80 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Free tier limit</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audited Multi-Provider Routing</span>
          </div>
          <span>{items.length} Tracked</span>
        </div>
      </div>
    </div>
  );
};
