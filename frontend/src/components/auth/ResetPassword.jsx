import React, { useState } from 'react';
import { authService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AlertCircle, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle,
  GraduationCap,
  Key,
  ArrowLeft,
  Mail
} from 'lucide-react';
import { CircularProgress } from '@mui/material';

export default function ResetPassword() {
  const { updateUser } = useAuth();
  
  // Extract parameters from URL query parameters (if they clicked an email fallback URL)
  const searchParams = new URLSearchParams(window.location.search);
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [role, setRole] = useState(searchParams.get('role') || 'advisor');
  const [otp, setOtp] = useState(searchParams.get('token') || searchParams.get('otp') || '');
  const [isUrlPrefilled] = useState(!!(searchParams.get('email') && searchParams.get('role')));

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !role || !otp) {
      return setError('Please fill in all fields (email, role, OTP code).');
    }

    if (otp.length !== 6) {
      return setError('OTP verification code must be exactly 6 digits.');
    }

    if (!password || !confirmPassword) {
      return setError('Please provide a new password.');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters long.');
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setError('');
    setLoading(true);

    try {
      const user = await authService.resetPassword(otp, email.trim(), role, password);
      setSuccess(true);
      
      // Auto login user:
      localStorage.setItem('isLoggedIn', 'true');
      
      // Give a brief delay so the user can see the success state, then redirect
      setTimeout(() => {
        updateUser(user);
        window.history.replaceState(null, '', '/dashboard');
        // Force URL state refresh
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The OTP code may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'advisor', title: 'Batch Advisor' },
    { id: 'admin', title: 'HOD' },
    { id: 'academic_admin', title: 'Administrator' },
    { id: 'super_admin', title: 'Dean' },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row font-sans selection:bg-blue-600 selection:text-white bg-slate-50 w-full min-h-screen">
      
      {/* Left Panel: Feature Highlights (Matches Login Page) */}
      <div className="w-full md:w-[45%] bg-slate-900 text-white flex flex-col justify-center px-8 xl:px-12 py-16 relative overflow-hidden shrink-0">
        <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-blue-900/20 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[150px] pointer-events-none" />

        <div className="relative z-10 max-w-md mx-auto w-full flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
            <GraduationCap className="h-9 w-9 text-white" />
          </div>
          
          <h1 className="text-3xl font-black tracking-tight text-white mb-2 font-display">
            BatchMinder
          </h1>
          <p className="text-slate-400 text-sm text-center mb-12 font-medium">
            AI-Assisted Batch Advisor & Smart Academic Management
          </p>

          <div className="w-full p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-4">
            <div className="flex gap-4 items-start">
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 border border-white/5 shrink-0">
                <Key className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">OTP Account Recovery</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your 6-digit numeric recovery code sent via email to securely reset your account credentials.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Reset Password Form */}
      <div className="flex-1 bg-white flex flex-col justify-center px-6 sm:px-12 py-10 relative overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-6 select-none my-auto">
          
          <div className="space-y-2">
            <button
              onClick={() => {
                window.history.replaceState(null, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider mb-2 border-none bg-transparent cursor-pointer p-0"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </button>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Set New Password
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              Verify your OTP and update your account password
            </p>
          </div>

          <>
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="font-semibold leading-normal">{error}</span>
              </div>
            )}

            {success ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm flex flex-col items-center gap-4 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-emerald-900">Password Reset Successful!</h4>
                  <p className="text-emerald-600 text-xs mt-1">
                    Your password has been securely updated. Logging you into the BatchMinder portal...
                  </p>
                </div>
                <CircularProgress size={20} className="text-emerald-600 mt-2" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Account Details / Inputs */}
                {isUrlPrefilled ? (
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-slate-700 text-xs space-y-1 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-blue-500">Reset Target Account</div>
                    <div><span className="font-bold">Email: </span>{email}</div>
                    <div><span className="font-bold">Role: </span>{roles.find(r => r.id === role)?.title || role}</div>
                  </div>
                ) : (
                  <>
                    {/* Role Selection Dropdown */}
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        Account Role
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-sm cursor-pointer"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Email Input */}
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        Institutional Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                          <Mail className="h-5 w-5" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="batchadvisor@stmu.edu.pk"
                          required
                          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* 6-Digit OTP */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    6-Digit OTP Recovery Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    required
                    className="w-full text-center tracking-[10px] font-mono font-bold text-2xl py-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-lg"
                  />
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-12 pr-12 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none border-none bg-transparent"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-12 pr-12 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none border-none bg-transparent"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Reset Password Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 border-none cursor-pointer"
                >
                  {loading ? (
                    <>
                      <CircularProgress size={16} color="inherit" />
                      <span>Verifying & Resetting...</span>
                    </>
                  ) : (
                    'Verify OTP & Reset Password'
                  )}
                </button>
              </form>
            )}
          </>

          {/* Secured Banner */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/30 text-blue-800 text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle className="h-5 w-5 text-blue-600 shrink-0" />
            <span>Secured with Firebase Authentication • Role-Based Access Control enforced</span>
          </div>

        </div>
      </div>
    </div>
  );
}
