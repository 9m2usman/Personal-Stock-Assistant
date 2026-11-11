import React, { useState } from 'react';
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
  Search
} from 'lucide-react';

interface AppShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
  onSearchSymbol?: (symbol: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  setActiveTab,
  children,
  onSearchSymbol,
}) => {
  const [quickSearch, setQuickSearch] = useState('');

  const navItems = [
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
    { id: 'research', label: 'Stock Research', icon: Building2 },
    { id: 'technical', label: 'Technical Studio', icon: Activity },
    { id: 'portfolio', label: 'Portfolio & Excel', icon: PieChart },
    { id: 'scenarios', label: 'What-If Scenarios', icon: Sliders },
    { id: 'news', label: 'News & Sentiment', icon: Newspaper },
    { id: 'jobs', label: 'Task Workers', icon: Cpu },
  ];

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      if (onSearchSymbol) onSearchSymbol(quickSearch.trim().toUpperCase());
      setActiveTab('research');
      setQuickSearch('');
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight text-slate-100">Stock Assistant</div>
            <div className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Institutional AI</div>
          </div>
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
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-800/80 space-y-2">
          <a
            href="https://github.com/9m2usman/Personal-Stock-Assistant"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <Code2 className="w-4 h-4" />
            <span>GitHub Repository</span>
          </a>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>6 Providers Connected</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 bg-slate-900/60 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <form onSubmit={handleQuickSearch} className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value.toUpperCase())}
              placeholder="Quick search any ticker (e.g. NVDA)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
            />
          </form>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              FastAPI Engine Operational
            </span>
          </div>
        </header>

        {/* View Container */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};
