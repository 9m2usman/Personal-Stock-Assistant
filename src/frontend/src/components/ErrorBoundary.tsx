import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('INKVECTOR Error Boundary caught a runtime error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto my-8 p-6 rounded-2xl border border-rose-500/30 bg-[var(--bg-secondary)] shadow-xl animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {this.props.fallbackTitle || 'An unexpected error occurred in this workspace view'}
                </h2>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Runtime Protection Active
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                The INKVECTOR safety boundary prevented an application-level blank screen crash.
                {this.state.error?.message ? ` Error: ${this.state.error.message}` : ''}
              </p>

              {this.state.error && (
                <details className="mt-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[11px] font-mono text-rose-300 overflow-x-auto">
                  <summary className="cursor-pointer text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] select-none">
                    View Diagnostic Details
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-[10px] text-rose-400/90 leading-tight">
                    {this.state.error.stack || this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry Workspace
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Application
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
