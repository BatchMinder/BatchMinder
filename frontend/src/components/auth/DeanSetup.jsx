import React, { useState } from 'react';
import { ShieldAlert, Mail, Lock, Key, User, CheckCircle2, ArrowLeft } from 'lucide-react';
import CircularProgress from '@mui/material/CircularProgress';

export default function DeanSetup({ setCurrentPath }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !secret) {
      return setError('Please fill in the required fields (Email, Password, Secret Key)');
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/setup-dean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, secret })
      });
      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Action completed successfully!');
        setName('');
        setEmail('');
        setPassword('');
        setSecret('');
      } else {
        setError(data.message || 'An error occurred during verification');
      }
    } catch (err) {
      setError('Network error verifying credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-[440px] bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xl space-y-6 select-none relative overflow-hidden">
        
        {/* Decorative background gradient line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 animate-pulse" />

        <div className="space-y-2 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Dean Portal
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Register or recover the primary Dean profile
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-semibold flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Secret Key */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
              System Authorization Secret
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Key className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter secret authorization key"
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all duration-200 text-sm"
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Full Name (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Syed Arif Shah"
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all duration-200 text-sm"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Institutional Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="s.arif@stmu.edu.pk"
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all duration-200 text-sm"
              />
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all duration-200 text-sm"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/10 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <CircularProgress size={16} color="inherit" />
                <span>Processing...</span>
              </>
            ) : (
              'Create / Update Profile'
            )}
          </button>

        </form>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/');
              setCurrentPath('/');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors focus:outline-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
          </button>
        </div>

      </div>
    </div>
  );
}
