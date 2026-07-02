import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Shield } from 'lucide-react';

export default function Login({ setView }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('advisor');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !role) {
      return setError('Please fill in all fields');
    }
    
    // Email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return setError('Please enter a valid email address');
    }

    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password, role);
      setView('dashboard');
    } catch (err) {
      setError(err.message || 'Incorrect email, password, or role');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'advisor', title: 'Advisor' },
    { id: 'admin', title: 'HOD / Admin' },
    { id: 'academic_admin', title: 'Academic Admin' },
  ];

  return (
    <div className="w-full max-w-[420px] px-8 py-10 rounded-3xl bg-white border border-slate-100 shadow-[0_15px_50px_-15px_rgba(15,23,42,0.06)] flex flex-col relative select-none">
      <div className="flex flex-col items-center mb-6">
        <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full bg-blue-50/70 text-blue-600 mb-4 border border-blue-100/50">
          Admin Control Center
        </span>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">Sign In</h2>
        <p className="text-slate-400 text-xs mt-2 text-center leading-relaxed">
          Enter your credentials to access the admin panel
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span className="leading-normal">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Role Selector Tabs */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            Select Role
          </label>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r) => {
              const isSelected = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-600 shadow-sm text-blue-600'
                      : 'bg-slate-50/50 border-slate-200/80 text-slate-500 hover:border-slate-300 hover:bg-slate-100/30'
                  }`}
                >
                  <Shield className={`h-3.5 w-3.5 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                  <span className="text-[9px] font-bold truncate w-full">{r.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/80 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 text-sm"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-4 pr-16 py-3 rounded-xl bg-slate-50/50 border border-slate-200/80 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-[0_4px_12px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.25)] active:scale-[0.98] transition-all duration-250 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-8 text-center text-xs text-slate-400">
        Don't have an account?{' '}
        <button
          onClick={() => setView('signup')}
          className="text-blue-600 hover:text-blue-700 font-bold transition-colors focus:outline-none inline-flex items-center gap-1"
        >
          Create an account
        </button>
      </div>
    </div>
  );
}
