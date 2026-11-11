import React, { useState, useEffect, useRef } from 'react';
import {
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
  Zap,
  Search,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  Cpu,
  User,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import { searchInstruments, NormalizedInstrument, fetchWorkerHealth } from '../api/client.ts';
import { CommandPalette } from './CommandPalette.tsx';
import { AuthModal } from './AuthModal.tsx';
import { OnboardingWizard } from './OnboardingWizard.tsx';
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
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [watchlistDrawerOpen, setWatchlistDrawerOpen] = useState(false);

  // Search in Header
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NormalizedInstrument[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // User Profile
  const [user, setUser] = useState<{ name: string; email: string; tier: string } | null>(() => {
    try {
      const saved = localStorage.getItem('inkvector_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Background Worker Health
  const [workerHealth, setWorkerHealth] = useState<any>(null);

  useEffect(() => {
    fetchWorkerHealth()
      .then((h) => setWorkerHealth(h))
      .catch(() => setWorkerHealth(null));
  }, []);

  // Check if first-time user
  useEffect(() => {
    try {
      const onboarded = localStorage.getItem('inkvector_onboarded');
      if (!onboarded) {
        setOnboardingOpen(true);
      }
    } catch {
      // storage
    }
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
      const res = await searchInstruments(val.trim(), undefined, 6);
      setSearchResults(res);
      setSearchOpen(true);
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelectInstrument = (symbol: string) => {
    onSelectSymbol(symbol);
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
    setActiveTab('stock_detail');
  };

  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'markets', label: 'Markets Discovery', icon: Globe2 },
        { id: 'stock_detail', label: 'Stock Detail Studio', icon: Building2 },
        { id: 'watchlists', label: 'Watchlists', icon: Star },
        { id: 'portfolio', label: 'Portfolio & Excel', icon: PieChart },
        { id: 'research', label: 'Research & Peers', icon: BarChart3 },
        { id: 'news', label: 'News & Sentiment', icon: Newspaper },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { id: 'assistant', label: 'AI Assistant', icon: Bot },
        { id: 'analysis_lab', label: 'Analysis Lab', icon: FlaskConical },
        { id: 'saved', label: 'Saved Research', icon: Bookmark },
      ],
    },
    {
      title: 'PREFERENCES',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const getPageTitle = (tab: string) => {
    for (const sec of navSections) {
      for (const item of sec.items) {
        if (item.id === tab) return item.label;
      }
    }
    return 'Workspace';
  };

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden font-sans">
      {/* 1. Persistent Left Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-20' : 'w-64'
        } bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col shrink-0 transition-all duration-300 z-30 hidden md:flex`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <button
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-3 text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-sm font-extrabold tracking-tight text-[var(--text-primary)]">
                  INKVECTOR
                </div>
                <div className="text-[9px] text-emerald-400 font-mono font-bold tracking-wider uppercase">
                  Institutional AI
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Navigation Section Groups */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {navSections.map((section, sidx) => (
            <div key={sidx} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      collapsed ? 'justify-center px-0' : 'justify-between px-3'
                    } py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`} />
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                    {!collapsed && isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Active Instrument Widget */}
        {!collapsed && (
          <div className="mx-3 mb-3 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between">
            <div>
              <div className="text-[9px] font-mono font-bold uppercase text-[var(--text-muted)]">Active Focus</div>
              <button
                onClick={() => setActiveTab('stock_detail')}
                className="font-mono text-sm font-extrabold text-emerald-400 hover:underline"
              >
                {selectedSymbol}
              </button>
            </div>
            <button
              onClick={() => setWatchlistDrawerOpen(true)}
              className="text-[10px] text-[var(--text-secondary)] hover:text-emerald-400 font-semibold"
            >
              Watchlist →
            </button>
          </div>
        )}

        {/* Sidebar Footer: Profile, Theme, Collapse */}
        <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 text-left truncate group"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-emerald-400 shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {user?.name || 'Terminal Analyst'}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    {user?.tier || 'Institutional Tier'}
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                  title="Toggle Dark/Light Mode"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-emerald-600" />}
                </button>
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-emerald-600" />}
              </button>
              <button
                onClick={() => setCollapsed(false)}
                className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-72 bg-[var(--bg-secondary)] h-full p-4 flex flex-col justify-between border-r border-[var(--border-color)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <span className="font-extrabold text-sm text-[var(--text-primary)]">INKVECTOR</span>
                </div>
                <button onClick={() => setMobileDrawerOpen(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {navSections.map((sec, i) => (
                  <div key={i} className="space-y-1">
                    <div className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)] px-2">
                      {sec.title}
                    </div>
                    {sec.items.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => {
                          setActiveTab(it.id);
                          setMobileDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
                          activeTab === it.id
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                        }`}
                      >
                        <it.icon className="w-4 h-4" />
                        <span>{it.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)] font-mono">{user?.name || 'Analyst'}</span>
              <button onClick={toggleTheme} className="p-2 rounded-lg bg-[var(--bg-card)]">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-[var(--bg-secondary)]/90 backdrop-blur-md border-b border-[var(--border-color)] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)]"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb / Title */}
            <div>
              <div className="text-[10px] font-mono uppercase text-[var(--text-muted)]">INKVECTOR Terminal</div>
              <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                {getPageTitle(activeTab)}
              </h2>
            </div>
          </div>

          {/* Global Search Input Autocomplete */}
          <div ref={searchContainerRef} className="relative w-72 sm:w-80 hidden md:block">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim()) setSearchOpen(true);
                }}
                onChange={(e) => handleSearchChange(e.target.value.toUpperCase())}
                placeholder="Search stocks (NVDA, Apple, HSBA.L)..."
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-8 pr-16 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono transition"
              />
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="absolute right-2 top-1.5 px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)] hover:text-emerald-400 transition"
              >
                Ctrl+K
              </button>
            </div>

            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-10 left-0 right-0 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl p-2 z-50 space-y-1">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectInstrument(item.display_symbol)}
                    className="w-full p-2 text-left flex items-center justify-between hover:bg-[var(--bg-elevated)] rounded-xl transition text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-emerald-400">{item.display_symbol}</span>
                        <span className="text-[9px] px-1 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                          {item.exchange_name}
                        </span>
                        {item.is_adr && (
                          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-mono">
                            ADR
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] truncate max-w-[200px]">
                        {item.company_name}
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">Select →</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Header Controls: Palette, Notifications, Theme, Watchlist */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-emerald-500 text-[var(--text-muted)] hover:text-emerald-400 transition"
              title="Command Palette (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => setWatchlistDrawerOpen(true)}
              className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-emerald-500 text-[var(--text-muted)] hover:text-emerald-400 transition"
              title="Quick Watchlist Drawer"
            >
              <Star className="w-4 h-4" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-emerald-500 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-emerald-600" />}
            </button>

            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{user?.name ? 'Terminal Active' : 'Sign In'}</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
        onSelectSymbol={(sym) => onSelectSymbol(sym)}
      />

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => setUser(u)}
      />

      {/* First-Time Onboarding Wizard */}
      <OnboardingWizard
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={() => setActiveTab('overview')}
      />

      {/* Watchlist Quick Drawer */}
      <WatchlistDrawer
        isOpen={watchlistDrawerOpen}
        onClose={() => setWatchlistDrawerOpen(false)}
        selectedSymbol={selectedSymbol}
        onSelectSymbol={(sym) => {
          onSelectSymbol(sym);
          setActiveTab('stock_detail');
        }}
      />
    </div>
  );
};
