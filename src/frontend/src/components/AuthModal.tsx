import React, { useState } from 'react';
import { Shield, Lock, Mail, User, Eye, EyeOff, ArrowRight, CheckCircle2, Zap, X } from 'lucide-react';
import { AuthVisual3D } from './AuthVisual3D.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { name: string; email: string; tier: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both institutional email and credentials.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const user = {
        name: name || (email.split('@')[0] || 'Institutional User'),
        email,
        tier: 'Enterprise Terminal',
      };
      localStorage.setItem('inkvector_user', JSON.stringify(user));
      onSuccess(user);
      onClose();
    }, 600);
  };

  const handleDemoLogin = () => {
    const demoUser = {
      name: 'Quantitative Analyst',
      email: 'quant@inkvector.internal',
      tier: 'Institutional Pro',
    };
    localStorage.setItem('inkvector_user', JSON.stringify(demoUser));
    onSuccess(demoUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-4xl h-[560px] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden flex flex-col md:flex-row relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Side: 3D Immersive Telemetry */}
        <div className="hidden md:block w-1/2 h-full relative overflow-hidden border-r border-[var(--border-color)]">
          <AuthVisual3D height={560} />
        </div>

        {/* Right Side: Authentication Form */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-between overflow-y-auto bg-[var(--bg-card)]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div className="font-extrabold text-sm tracking-tight text-[var(--text-primary)]">
                INKVECTOR
              </div>
            </div>

            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {mode === 'login' ? 'Terminal Access' : 'Create Intelligence Account'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {mode === 'login'
                ? 'Sign in to access real-time financial models, portfolio stress testing, and AI harness.'
                : 'Join institutional traders using AI-driven SEC EDGAR facts and multi-market pipelines.'}
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Corporate / Terminal Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@firm.com"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                  Encrypted Key / Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-9 pr-9 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : mode === 'login' ? 'Authorize Session' : 'Provision Terminal'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
            <button
              onClick={handleDemoLogin}
              className="w-full py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Demo Direct Access (Institutional Preview)
            </button>

            <div className="text-center text-[11px] text-[var(--text-muted)]">
              {mode === 'login' ? (
                <>
                  Need terminal credentials?{' '}
                  <button
                    onClick={() => setMode('register')}
                    className="text-emerald-400 font-semibold hover:underline"
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-emerald-400 font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
