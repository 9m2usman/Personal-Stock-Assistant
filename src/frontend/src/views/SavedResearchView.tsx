import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Search,
  Trash2,
  ExternalLink,
  Download,
  Calendar,
  Building2,
  PieChart,
  BarChart3,
  Bot,
  Filter,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface SavedItem {
  id: string;
  title: string;
  category: 'Dossier' | 'Comparison' | 'Portfolio' | 'AI Transcript';
  symbol?: string;
  created_at: string;
  snippet: string;
}

export const SavedResearchView: React.FC<{
  onSelectSymbol?: (symbol: string) => void;
  onNavigate?: (tabId: string) => void;
}> = ({ onSelectSymbol, onNavigate }) => {
  const [items, setItems] = useState<SavedItem[]>([
    {
      id: 'saved-1',
      title: 'NVIDIA Corporation Institutional Dossier (Q3 FY25)',
      category: 'Dossier',
      symbol: 'NVDA',
      created_at: '2026-11-10T14:30:00Z',
      snippet: 'SEC Form 10-Q verification of data center operating margins and technical indicators over 50-day moving average.',
    },
    {
      id: 'saved-2',
      title: 'Semiconductor Peer Comparison (NVDA vs AMD vs MSFT)',
      category: 'Comparison',
      created_at: '2026-11-09T18:15:00Z',
      snippet: 'Gross margin benchmarking, enterprise multiples, and ROE comparison across key hyperscale semiconductor suppliers.',
    },
    {
      id: 'saved-3',
      title: 'Institutional Tech Portfolio Valuation & HHI Stress Test',
      category: 'Portfolio',
      created_at: '2026-11-08T11:45:00Z',
      snippet: 'Multi-currency ECB spot rate normalization across 5 positions with simulated -10% market shock impact analysis.',
    },
    {
      id: 'saved-4',
      title: 'AI Valuation Model: Apple CapEx vs Free Cash Flow',
      category: 'AI Transcript',
      symbol: 'AAPL',
      created_at: '2026-11-07T09:20:00Z',
      snippet: 'Interactive conversational report evaluating capital expenditures and free cash flow generation from SEC audited filings.',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.symbol && item.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'ALL' || item.category.toUpperCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleExport = (item: SavedItem) => {
    const content = `# ${item.title}\nCategory: ${item.category}\nDate: ${item.created_at}\n\n${item.snippet}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.id}_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = ['ALL', 'DOSSIER', 'COMPARISON', 'PORTFOLIO', 'AI TRANSCRIPT'];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Institutional Archive
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <Bookmark className="w-6 h-6 text-emerald-400" />
            Saved Research & Analysis Library
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Persisted company valuation dossiers, peer benchmarking tables, and exportable research reports.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved reports..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition ${
              selectedCategory === cat
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-color)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Saved Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between space-y-3 hover:border-emerald-500/40 hover:shadow-lg transition"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {item.category}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>

              <h3 className="text-sm font-bold text-[var(--text-primary)] mt-2">
                {item.title}
              </h3>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1 line-clamp-3">
                {item.snippet}
              </p>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
              {item.symbol && onSelectSymbol && onNavigate ? (
                <button
                  onClick={() => {
                    onSelectSymbol(item.symbol!);
                    onNavigate('stock_detail');
                  }}
                  className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                >
                  Open {item.symbol} Workspace <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-[11px] font-mono text-[var(--text-muted)]">{item.id}</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport(item)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-emerald-400 transition"
                  title="Export Markdown"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-rose-400 transition"
                  title="Delete Report"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="py-20 text-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)] space-y-2">
          <Bookmark className="w-8 h-8 mx-auto text-emerald-400" />
          <p>No saved research matching your search criteria.</p>
        </div>
      )}
    </div>
  );
};
