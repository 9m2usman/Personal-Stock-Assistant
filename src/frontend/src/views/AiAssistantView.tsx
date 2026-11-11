import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  User,
  Send,
  Sparkles,
  Search,
  Plus,
  Activity,
  BarChart3,
  Building2,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Cpu,
  Trash2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { sendChatMessage, fetchChatHistory } from '../api/client.ts';
import { AiNetwork3D } from '../components/AiNetwork3D.tsx';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ui_widgets?: any[];
  sources?: any[];
  timestamp?: string;
}

export const AiAssistantView: React.FC<{ onSelectSymbol?: (symbol: string) => void }> = ({
  onSelectSymbol,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Welcome to the INKVECTOR AI Financial Research Assistant. I am directly integrated with real-time exchange data routers, SEC EDGAR XBRL filings, and an isolated Python computational sandbox.\n\nAsk me to analyze company fundamentals, compare multiples across peers, evaluate portfolio concentration, or explain quantitative indicators.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [sessionId, setSessionId] = useState('session_main');
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'done'>('idle');
  const [processingStep, setProcessingStep] = useState<string>('');
  const [savedSessions, setSavedSessions] = useState<string[]>([
    'session_main',
    'nvda_deep_dive',
    'portfolio_risk_audit',
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, processingStep]);

  const quickPrompts = [
    'Compare NVIDIA and AMD',
    'Analyze NVDA gross margins from SEC Form 10-Q',
    'Calculate RSI (14) and MACD for AAPL',
    'Review portfolio Herfindahl concentration index',
    'What are the macro market catalysts today?',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || processingState === 'processing') return;

    const userMsg: Message = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setProcessingState('processing');

    // Simulate realistic analytical pipeline stages
    setProcessingStep('1/5 Parsing query & financial intent...');
    setTimeout(() => setProcessingStep('2/5 Resolving global tickers & MICs...'), 400);
    setTimeout(() => setProcessingStep('3/5 Retrieving SEC facts & quotes...'), 900);
    setTimeout(() => setProcessingStep('4/5 Executing quantitative indicators...'), 1400);
    setTimeout(() => setProcessingStep('5/5 Synthesizing grounded explanation...'), 1800);

    try {
      const res = await sendChatMessage(text.trim(), sessionId);

      const aiMsg: Message = {
        role: 'assistant',
        content: res.answer,
        ui_widgets: res.ui_widgets,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setProcessingState('done');
    } catch (err: any) {
      const errorMsg: Message = {
        role: 'assistant',
        content: `Analytical Error: ${err.message || 'Unable to connect to AI reasoning core. Ensure backend server is running.'}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setProcessingState('idle');
    } finally {
      setProcessingStep('');
      setTimeout(() => setProcessingState('idle'), 2000);
    }
  };

  const handleNewSession = () => {
    const newId = `session_${Date.now()}`;
    setSavedSessions([newId, ...savedSessions]);
    setSessionId(newId);
    setMessages([
      {
        role: 'assistant',
        content: `New research workspace initialized (${newId}). How can I assist your financial investigation?`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* 3D AI Neural Processing Mesh Header */}
      <AiNetwork3D status={processingState} height={200} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Session History */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Research Sessions
            </h3>
            <button
              onClick={handleNewSession}
              className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition"
              title="New Session"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {savedSessions.map((id) => (
              <button
                key={id}
                onClick={() => setSessionId(id)}
                className={`w-full p-2.5 rounded-xl text-left text-xs font-mono transition flex items-center justify-between ${
                  sessionId === id
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                }`}
              >
                <span className="truncate">{id}</span>
                {sessionId === id && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2 text-xs">
            <div className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">
              AI Harness Architecture
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deterministic Tool Routing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Subprocess Python Sandbox</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>SEC EDGAR XBRL Grounding</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Conversation Panel (3 Cols) */}
        <div className="lg:col-span-3 p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col justify-between h-[650px]">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((m, idx) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={idx}
                  className={`flex gap-3 text-xs leading-relaxed ${
                    isAssistant ? 'items-start' : 'items-start flex-row-reverse'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      isAssistant
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-color)]'
                    }`}
                  >
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[85%] p-4 rounded-2xl border space-y-2 ${
                      isAssistant
                        ? 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)]'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="whitespace-pre-line text-xs">{m.content}</div>

                    {/* UI Widgets Render */}
                    {m.ui_widgets && m.ui_widgets.length > 0 && (
                      <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
                        {m.ui_widgets.map((widget: any, widx: number) => {
                          const wType = widget.widget_type || widget.type;
                          const wData = widget.data || widget;

                          if (wType === 'COMPARISON_MATRIX') {
                            const symA = wData.symbol_a || 'Symbol A';
                            const symB = wData.symbol_b || 'Symbol B';
                            const qA = wData.quote_a || {};
                            const qB = wData.quote_b || {};
                            const fA = wData.fundamentals_a || {};
                            const fB = wData.fundamentals_b || {};
                            const tA = wData.technicals_a || {};
                            const tB = wData.technicals_b || {};

                            return (
                              <div
                                key={widx}
                                className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-emerald-500/30 space-y-3 font-mono"
                              >
                                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                                  <span>HEAD-TO-HEAD COMPARISON</span>
                                  <span className="text-[10px] text-[var(--text-muted)]">Live Data Router</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs border-b border-[var(--border-subtle)] pb-2 font-bold text-[var(--text-primary)]">
                                  <div>Metric</div>
                                  <div className="text-emerald-400">{symA}</div>
                                  <div className="text-cyan-400">{symB}</div>
                                </div>

                                <div className="space-y-1.5 text-xs">
                                  <div className="grid grid-cols-3 gap-2 text-[var(--text-secondary)]">
                                    <span className="text-[var(--text-muted)]">Price</span>
                                    <span className="font-bold text-[var(--text-primary)]">${Number(qA.price || 0).toFixed(2)}</span>
                                    <span className="font-bold text-[var(--text-primary)]">${Number(qB.price || 0).toFixed(2)}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-[var(--text-secondary)]">
                                    <span className="text-[var(--text-muted)]">P/E Ratio</span>
                                    <span>{fA.pe_ratio != null ? fA.pe_ratio : 'N/A'}</span>
                                    <span>{fB.pe_ratio != null ? fB.pe_ratio : 'N/A'}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-[var(--text-secondary)]">
                                    <span className="text-[var(--text-muted)]">Gross Margin</span>
                                    <span>{fA.gross_margin_percent != null ? `${fA.gross_margin_percent}%` : 'N/A'}</span>
                                    <span>{fB.gross_margin_percent != null ? `${fB.gross_margin_percent}%` : 'N/A'}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-[var(--text-secondary)]">
                                    <span className="text-[var(--text-muted)]">14-Day RSI</span>
                                    <span>{tA.rsi_14 != null ? Number(tA.rsi_14).toFixed(1) : 'N/A'}</span>
                                    <span>{tB.rsi_14 != null ? Number(tB.rsi_14).toFixed(1) : 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          if (wType === 'SCENARIO_SIMULATION') {
                            return (
                              <div
                                key={widx}
                                className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-purple-500/30 space-y-3 font-mono"
                              >
                                <div className="flex items-center justify-between text-xs font-bold text-purple-400">
                                  <span>HYPOTHETICAL REALLOCATION RECEIPT</span>
                                  <span className="text-[10px] text-[var(--text-muted)]">
                                    NAV Delta: ${Number(wData.nav_change || 0).toFixed(2)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                  <div className="p-2 rounded bg-[var(--bg-card)]">
                                    <span className="text-[var(--text-muted)] block text-[10px]">BEFORE NAV</span>
                                    <span className="font-bold text-[var(--text-primary)]">
                                      ${Number(wData.before_nav || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="p-2 rounded bg-[var(--bg-card)]">
                                    <span className="text-[var(--text-muted)] block text-[10px]">AFTER NAV</span>
                                    <span className="font-bold text-[var(--text-primary)]">
                                      ${Number(wData.after_nav || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="p-2 rounded bg-[var(--bg-card)]">
                                    <span className="text-[var(--text-muted)] block text-[10px]">REMAINDER CASH</span>
                                    <span className="font-bold text-emerald-400">
                                      ${Number(wData.after_cash || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="p-2 rounded bg-[var(--bg-card)]">
                                    <span className="text-[var(--text-muted)] block text-[10px]">HHI DELTA</span>
                                    <span className="font-bold text-cyan-400">
                                      {wData.before_hhi?.toFixed(3)} ➔ {wData.after_hhi?.toFixed(3)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={widx}
                              className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-mono"
                            >
                              <div className="text-[10px] uppercase text-emerald-400 font-bold mb-1">
                                {wType || 'Institutional Widget'}
                              </div>
                              <pre className="text-[11px] text-[var(--text-secondary)] overflow-x-auto">
                                {JSON.stringify(wData, null, 2)}
                              </pre>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Sources Citations */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                        <span className="font-bold text-[var(--text-secondary)]">Citations:</span>
                        {m.sources.map((s: any, sidx: number) => (
                          <span key={sidx} className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)]">
                            {typeof s === 'string' ? s : s.title || s.name || 'Financial Source'}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[9px] font-mono text-[var(--text-muted)] text-right">
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Processing Steps Sequence */}
            {processingStep && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono flex items-center gap-2 animate-pulse">
                <Cpu className="w-4 h-4 animate-spin" />
                <span>{processingStep}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts & Input Area */}
          <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase shrink-0">
                Suggested:
              </span>
              {quickPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(p)}
                  className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-emerald-500/40 text-[11px] text-[var(--text-secondary)] hover:text-emerald-400 whitespace-nowrap transition"
                >
                  {p}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask financial question, request stock valuation, or run Python models..."
                disabled={processingState === 'processing'}
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={processingState === 'processing' || !inputPrompt.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Execute</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
