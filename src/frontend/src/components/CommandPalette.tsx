import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Globe2,
  Building2,
  Star,
  PieChart,
  BarChart3,
  Newspaper,
  Bot,
  FlaskConical,
  Bookmark,
  Settings,
  Sun,
  Moon,
  ArrowRight,
  Upload,
  Activity,
  Sliders,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import { searchInstruments, NormalizedInstrument } from '../api/client.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
  onSelectSymbol: (symbol: string) => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Action' | 'Stocks';
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
  badge?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectSymbol,
}) => {
  const [query, setQuery] = useState('');
  const [stockResults, setStockResults] = useState<NormalizedInstrument[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setStockResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles open
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Stock search debounce
  useEffect(() => {
    if (!query.trim()) {
      setStockResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await searchInstruments(query.trim(), undefined, 6);
        setStockResults(res);
      } catch {
        setStockResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const navigationCommands: CommandItem[] = [
    {
      id: 'nav-overview',
      title: 'Overview Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => { onNavigate('overview'); onClose(); },
      shortcut: 'G O'
    },
    {
      id: 'nav-markets',
      title: 'Markets & Instrument Discovery',
      category: 'Navigation',
      icon: Globe2,
      action: () => { onNavigate('markets'); onClose(); },
      shortcut: 'G M'
    },
    {
      id: 'nav-detail',
      title: 'Stock Detail & Candlestick Studio',
      category: 'Navigation',
      icon: Activity,
      action: () => { onNavigate('stock_detail'); onClose(); },
      shortcut: 'G S'
    },
    {
      id: 'nav-watchlists',
      title: 'Watchlists Management',
      category: 'Navigation',
      icon: Star,
      action: () => { onNavigate('watchlists'); onClose(); },
      shortcut: 'G W'
    },
    {
      id: 'nav-portfolio',
      title: 'Portfolio & Excel Import',
      category: 'Navigation',
      icon: PieChart,
      action: () => { onNavigate('portfolio'); onClose(); },
      shortcut: 'G P'
    },
    {
      id: 'nav-research',
      title: 'Company Comparison & Peer Research',
      category: 'Navigation',
      icon: BarChart3,
      action: () => { onNavigate('research'); onClose(); },
      shortcut: 'G R'
    },
    {
      id: 'nav-news',
      title: 'Financial News & Market Sentiment',
      category: 'Navigation',
      icon: Newspaper,
      action: () => { onNavigate('news'); onClose(); },
      shortcut: 'G N'
    },
    {
      id: 'nav-assistant',
      title: 'AI Financial Assistant & Harness',
      category: 'Navigation',
      icon: Bot,
      action: () => { onNavigate('assistant'); onClose(); },
      shortcut: 'G A'
    },
    {
      id: 'nav-analysis',
      title: 'Analysis Lab (Python & Background Tasks)',
      category: 'Navigation',
      icon: FlaskConical,
      action: () => { onNavigate('analysis_lab'); onClose(); },
      shortcut: 'G L'
    },
    {
      id: 'nav-saved',
      title: 'Saved Research & Reports',
      category: 'Navigation',
      icon: Bookmark,
      action: () => { onNavigate('saved'); onClose(); },
    },
    {
      id: 'nav-settings',
      title: 'System Preferences & Integrations',
      category: 'Navigation',
      icon: Settings,
      action: () => { onNavigate('settings'); onClose(); },
    },
  ];

  const actionCommands: CommandItem[] = [
    {
      id: 'act-theme',
      title: `Toggle Theme (Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode)`,
      category: 'Action',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => { toggleTheme(); onClose(); },
      badge: 'Theme'
    },
    {
      id: 'act-excel',
      title: 'Import Portfolio from Excel / CSV',
      category: 'Action',
      icon: Upload,
      action: () => { onNavigate('portfolio'); onClose(); },
      badge: 'Excel'
    },
    {
      id: 'act-scenario',
      title: 'Simulate What-If Market Shock',
      category: 'Action',
      icon: Sliders,
      action: () => { onNavigate('analysis_lab'); onClose(); },
      badge: 'Stress'
    },
  ];

  const stockCommands: CommandItem[] = stockResults.map((item) => ({
    id: `stock-${item.id}`,
    title: `${item.display_symbol} — ${item.company_name}`,
    category: 'Stocks',
    icon: Building2,
    badge: `${item.exchange_name} · ${item.currency}`,
    action: () => {
      onSelectSymbol(item.display_symbol);
      onNavigate('stock_detail');
      onClose();
    },
  }));

  const allFiltered = [
    ...stockCommands,
    ...navigationCommands.filter((c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
    ),
    ...actionCommands.filter((c) =>
      c.title.toLowerCase().includes(query.toLowerCase())
    ),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allFiltered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allFiltered.length) % (allFiltered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allFiltered[selectedIndex]) {
        allFiltered[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-3 bg-[var(--bg-card)]">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a stock ticker, company, or command (e.g. NVDA, Portfolio, Theme)..."
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-[var(--text-muted)] font-sans"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--border-color)] text-[var(--text-muted)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List Results */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[var(--border-subtle)]">
          {allFiltered.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              No matching stocks or commands found for "{query}".
            </div>
          ) : (
            allFiltered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition text-left ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'hover:bg-[var(--bg-card)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs text-[var(--text-primary)] font-medium truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {item.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)] font-mono">
                        {item.badge}
                      </span>
                    )}
                    {item.shortcut && (
                      <span className="text-[10px] font-mono text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)]">
                        {item.shortcut}
                      </span>
                    )}
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-transparent'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[var(--bg-main)] border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 rounded bg-[var(--bg-elevated)] font-mono">↑</kbd> <kbd className="px-1 rounded bg-[var(--bg-elevated)] font-mono">↓</kbd> navigate</span>
            <span><kbd className="px-1 rounded bg-[var(--bg-elevated)] font-mono">Enter</kbd> select</span>
            <span><kbd className="px-1 rounded bg-[var(--bg-elevated)] font-mono">Esc</kbd> close</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-400">Ctrl+K Palette</span>
        </div>
      </div>
    </div>
  );
};
