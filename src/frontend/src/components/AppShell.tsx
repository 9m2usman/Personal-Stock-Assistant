import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Building2,
  Activity,
  PieChart,
  Sliders,
  Newspaper,
  Cpu,
  Code2,
  Zap,
  CheckCircle2,
  Search,
  Star,
  ChevronRight,
  Globe,
  Radio
} from 'lucide-react';
import { searchInstruments, NormalizedInstrument, fetchWorkerHealth } from '../api/client.ts';
import { WatchlistDrawer } from './WatchlistDrawer.tsx';

interface AppShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  setActiveTab,
  selectedSymbol,
  onSelectSymbol,
  children,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NormalizedInstrument[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [workerHealth, setWorkerHealth] = useState<any>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const quickTickers = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'HSBA.L'];

  const navItems = [
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
    { id: 'research', label: 'Stock Research', icon: Building2 },
    { id: 'technical', label: 'Technical Studio', icon: Activity },
    { id: 'portfolio', label: 'Portfolio & Excel', icon: PieChart },
    { id: 'scenarios', label: 'What-If Scenarios', icon: Sliders },
    { id: 'news', label: 'News & Sentiment', icon: Newspaper },
    { id: 'jobs', label: 'Task Workers', icon: Cpu },
  ];

  useEffect(() => {
    // Check background health once on mount
    fetchWorkerHealth()
      .then((h) => setWorkerHealth(h))
      .catch(() => setWorkerHealth(null));
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    try {
      const results = await searchInstruments(val.trim(), undefined, 8);
      setSearchResults(results);
      setSearchOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectInstrument = (symbol: string) => {
    onSelectSymbol(symbol);
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectInstrument(searchResults[0].display_symbol);
    } else if (searchQuery.trim()) {
      handleSelectInstrument(searchQuery.trim().toUpperCase());
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight text-slate-100">INKVECTOR</div>
              <div className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                Stock Assistant
              </div>
            </div>
          </div>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            v0.1.0
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            );
          })}
        </nav>

        {/* Active Instrument Widget in Sidebar */}
        <div className="p-3 mx-3 mb-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Active Instrument</div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-extrabold text-emerald-400">{selectedSymbol}</span>
            <button
              onClick={() => setIsWatchlistOpen(true)}
              className="text-[10px] text-slate-400 hover:text-emerald-400 font-medium underline transition"
            >
              Change
            </button>
          </div>
        </div>

        {/* Footer Info & Repository */}
        <div className="p-4 border-t border-slate-800/80 space-y-2 text-xs">
          <a
            href="https://github.com/9m2usman/Personal-Stock-Assistant"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
          >
            <Code2 className="w-4 h-4" />
            <span>GitHub Repository</span>
          </a>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>6 Providers Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 bg-slate-900/80 border-b border-slate-800 px-6 flex items-center justify-between gap-4 shrink-0 backdrop-blur-md z-20">
          {/* Universal Search Autocomplete */}
          <div ref={searchContainerRef} className="relative w-80 max-w-sm">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim()) setSearchOpen(true);
                }}
                onChange={(e) => handleSearchChange(e.target.value.toUpperCase())}
                placeholder="Search global stocks (e.g. Apple, NVDA, HSBA.L)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
              />
            </form>

            {/* Dropdown Live Results */}
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-10 left-0 right-0 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 bg-slate-950/80">
                  Global Instruments Matches
                </div>
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectInstrument(item.display_symbol)}
                    className="w-full p-2.5 text-left flex items-center justify-between hover:bg-slate-800/60 transition"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-extrabold text-xs text-emerald-400">
                          {item.display_symbol}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                          {item.exchange_name}
                        </span>
                        {item.is_adr && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/40">
                            ADR
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300 truncate max-w-[200px]">
                        {item.company_name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {item.country} · {item.currency}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">Select →</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick-Switch Ticker Bar */}
          <div className="hidden xl:flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-2">Quick:</span>
            {quickTickers.map((sym) => (
              <button
                key={sym}
                onClick={() => onSelectSymbol(sym)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  selectedSymbol === sym
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Right Header Status Controls */}
          <div className="flex items-center gap-3">
            {/* Watchlist Toggle Button */}
            <button
              onClick={() => setIsWatchlistOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-200 text-xs font-bold rounded-lg transition"
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Watchlist</span>
            </button>

            {/* Live Operational Status Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>FastAPI Engine</span>
            </div>

            {/* Background Workers Indicator */}
            {workerHealth && (
              <div
                title={`Broker: ${workerHealth.redis_connection} (Eager: ${workerHealth.task_always_eager})`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  workerHealth.redis_connection === 'CONNECTED'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Radio className="w-3 h-3" />
                <span>Workers: {workerHealth.redis_connection === 'CONNECTED' ? 'Live' : 'Eager'}</span>
              </div>
            )}
          </div>
        </header>

        {/* View Container */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>

      {/* Slide-out Watchlist Drawer */}
      <WatchlistDrawer
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={(sym) => {
          onSelectSymbol(sym);
          setIsWatchlistOpen(false);
        }}
      />
    </div>
  );
};
