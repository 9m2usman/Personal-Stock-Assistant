import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { sendChatMessage, fetchChatHistory } from '../api/client.ts';
import { CandlestickChart } from '../components/CandlestickChart.tsx';

interface ChatWorkspaceProps {
  onSelectSymbol?: (symbol: string) => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({ onSelectSymbol }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'What is the current price of NVDA?',
    'Calculate 14-day RSI and 50-day SMA for Apple',
    'Show P/E ratio, margins, and ROE for Microsoft',
    'Latest market news on Tesla',
    'How should I analyze my portfolio risk?'
  ];

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadHistory = async () => {
    try {
      const history = await fetchChatHistory();
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        // Initial welcome message
        setMessages([
          {
            role: 'assistant',
            content: `### Welcome to AI Stock Market Assistant\n\nI am your institutional financial research co-pilot. I provide deterministic market analysis, multi-provider financial data (Twelve Data, FMP, Alpha Vantage, SEC EDGAR XBRL), technical indicators, and portfolio risk management with zero hallucinations.\n\nTry asking a question or click a prompt below!`,
            widgets: [],
            citations: ['Financial Assistant Engine v1.0.0']
          }
        ]);
      }
    } catch {
      // Fallback greeting if backend not reachable yet
      setMessages([
        {
          role: 'assistant',
          content: `Welcome to the AI Stock Market Assistant! Connect to the backend to begin research.`,
          widgets: [],
          citations: []
        }
      ]);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(query);
      if (res && res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error connecting to financial backend: ${err.message}. Please verify the backend is running.`,
          widgets: [],
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderWidget = (widget: any, idx: number) => {
    if (!widget || !widget.data) return null;

    if (widget.widget_type === 'CANDLESTICK_CHART') {
      return (
        <div key={idx} className="my-4">
          <CandlestickChart
            data={widget.data.candlesticks || []}
            indicators={widget.data.indicators}
            symbol={widget.data.symbol || 'STOCK'}
            height={360}
          />
        </div>
      );
    }

    if (widget.widget_type === 'QUOTE_CARD') {
      const d = widget.data;
      const isPos = String(d.change || '').startsWith('+') || Number(d.change) > 0;
      return (
        <div key={idx} className="my-3 p-4 bg-slate-900 border border-slate-800 rounded-xl max-w-sm shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-200">{d.symbol} • {d.exchange}</span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">{d.provider}</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">{d.currency} {d.price}</div>
          <div className={`text-xs font-semibold mt-1 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
            {d.change} ({d.change_percent}%)
          </div>
          {onSelectSymbol && (
            <button
              onClick={() => onSelectSymbol(d.symbol)}
              className="mt-3 w-full py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition"
            >
              Open Technical Studio
            </button>
          )}
        </div>
      );
    }

    if (widget.widget_type === 'FUNDAMENTAL_CARD') {
      const r = widget.data.ratios || {};
      const p = widget.data.profile || {};
      return (
        <div key={idx} className="my-3 p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-lg max-w-md">
          <div className="text-sm font-bold text-slate-200 mb-2">{p.company_name || widget.data.symbol} — Key Valuation Metrics</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">P/E Ratio</span>
              <span className="font-semibold text-slate-200">{r.pe_ratio ?? 'N/A'}</span>
            </div>
            <div className="p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Gross Margin</span>
              <span className="font-semibold text-emerald-400">{r.gross_margin_percent ? `${r.gross_margin_percent}%` : 'N/A'}</span>
            </div>
            <div className="p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Return on Equity</span>
              <span className="font-semibold text-slate-200">{r.return_on_equity_percent ? `${r.return_on_equity_percent}%` : 'N/A'}</span>
            </div>
            <div className="p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Debt to Equity</span>
              <span className="font-semibold text-slate-200">{r.debt_to_equity_ratio ?? 'N/A'}</span>
            </div>
          </div>
        </div>
      );
    }

    if (widget.widget_type === 'NEWS_FEED') {
      const articles = widget.data.articles || [];
      return (
        <div key={idx} className="my-3 space-y-2 max-w-lg">
          {articles.map((a: any, i: number) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="block p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-lg transition"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="font-medium text-emerald-400">{a.source}</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </div>
              <div className="text-xs font-semibold text-slate-200 leading-snug">{a.title}</div>
            </a>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto p-4">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center shrink-0 text-emerald-400 shadow-sm mt-1">
                <Bot className="w-5 h-5" />
              </div>
            )}

            <div
              className={`max-w-3xl rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Render dynamic UI widgets */}
              {msg.widgets && msg.widgets.map((w: any, widx: number) => renderWidget(w, widx))}

              {/* Render verification citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap gap-2">
                  <span className="font-semibold text-slate-400">Sources:</span>
                  {msg.citations.map((c: string, ci: number) => (
                    <span key={ci} className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300 shadow-sm mt-1">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2 px-3 bg-slate-900/60 border border-slate-800 rounded-lg w-fit">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Consulting financial providers & calculating quantitative indicators...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 text-xs">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(qp)}
            className="whitespace-nowrap px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-full border border-slate-800 hover:border-slate-700 transition"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="relative mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask anything: 'Analyze NVDA', 'Calculate RSI for Tesla', 'Show Microsoft 3-statement financials'..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition shadow-lg"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="absolute right-2 top-2 p-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 rounded-lg transition font-medium"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
