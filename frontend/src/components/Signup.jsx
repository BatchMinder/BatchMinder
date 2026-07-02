import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Shield } from 'lucide-react';

export default function Signup({ setView }) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('advisor');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const checkEmailAvailability = async (targetEmail, targetRole) => {
    if (!targetEmail) return;
    
    // Quick format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail.trim())) return;

    setCheckingEmail(true);
    try {
      const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(targetEmail.trim())}&role=${encodeURIComponent(targetRole)}`);
      if (response.ok) {
        const data = await response.json();
        setEmailExists(data.exists);
      }
    } catch (err) {
      console.error('Error checking email existence:', err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailBlur = () => {
    checkEmailAvailability(email, role);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      return setError('Please fill in all fields');
    }
    
    if (emailExists) {
      return setError('This email address is already in use');
    }
    
    // Front-end email regex verification
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return setError('Please enter a valid email address');
    }

    if (password.trim() !== confirmPassword.trim()) {
      return setError('Passwords do not match');
    }
    
    if (password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }

    setError('');
    setLoading(true);

    try {
      await signup(name, email.trim(), password, role);
      setView('dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'advisor', title: 'Batch Advisor', desc: 'Manage batches & students' },
    { id: 'admin', title: 'HOD / Admin', desc: 'Oversee department approvals' },
    { id: 'academic_admin', title: 'Academic Admin', desc: 'Timetables & transcripts' },
  ];

  return (
    <div className="w-full max-w-[480px] px-8 py-10 rounded-3xl bg-white border border-slate-100 shadow-[0_15px_50px_-15px_rgba(15,23,42,0.06)] flex flex-col relative select-none">
      <div className="flex flex-col items-center mb-6">
        <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full bg-blue-50/70 text-blue-600 mb-4 border border-blue-100/50">
          BatchMinder Portal
        </span>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">Create Account</h2>
        <p className="text-slate-400 text-xs mt-2 text-center leading-relaxed">
          Get started with BatchMinder advisor portal
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
          <span className="leading-normal">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Name and Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. John Doe"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border border-slate-200/80 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailExists) setEmailExists(false);
              }}
              onBlur={handleEmailBlur}
              placeholder="john.doe@uni.edu"
              className={`w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border focus:bg-white focus:ring-4 outline-none transition-all duration-200 text-sm ${
                emailExists 
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/5 text-red-900' 
                  : 'border-slate-200/80 focus:border-blue-600 focus:ring-blue-600/5 text-slate-800'
              }`}
            />
            {emailExists && (
              <p className="text-[10px] text-red-500 font-semibold mt-1">This email is already registered</p>
            )}
            {checkingEmail && (
              <p className="text-[10px] text-blue-500 font-semibold mt-1">Checking availability...</p>
            )}
          </div>
        </div>

        {/* Row 2: Passwords */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="w-full pl-4 pr-12 py-2.5 rounded-xl bg-slate-50/50 border border-slate-200/80 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 text-sm"
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

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 border border-slate-200/80 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 text-sm"
            />
          </div>
        </div>

        {/* Role Selector Grid */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Select System Role
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {roles.map((r) => {
              const isSelected = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRole(r.id);
                    checkEmailAvailability(email, r.id);
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-600 shadow-md shadow-blue-500/5'
                      : 'bg-slate-50/50 border-slate-200/80 hover:border-slate-350 hover:bg-slate-100/30'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={`text-[11px] font-bold ${isSelected ? 'text-blue-600' : 'text-slate-700'}`}>
                      {r.title}
                    </span>
                    <Shield className={`h-3.5 w-3.5 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-400 leading-normal">{r.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-[0_4px_12px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.25)] active:scale-[0.98] transition-all duration-250 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-450">
        Already have an account?{' '}
        <button
          onClick={() => setView('login')}
          className="text-blue-600 hover:text-blue-700 font-bold transition-colors focus:outline-none"
        >
          Sign in here
        </button>
      </div>
    </div>
  );
}
