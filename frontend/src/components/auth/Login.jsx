import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AlertCircle, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  Layers, 
  Cpu, 
  Calendar, 
  Monitor, 
  CheckCircle,
  GraduationCap,
  Clock
} from 'lucide-react';
import { CircularProgress } from '@mui/material';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('advisor');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password Recovery States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetRole, setResetRole] = useState('advisor');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  useEffect(() => {
    let timer;
    if (resetStep === 2 && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resetStep, timeLeft]);

  const getMaskedEmail = () => {
    if (!resetEmail) return '';
    const [name, domain] = resetEmail.split('@');
    if (!domain) return resetEmail;
    if (name.length <= 4) return `${name[0]}***@${domain}`;
    return `${name.substring(0, 5)}****@${domain}`;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleOtpChange = (e, index) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length > 1) return;
    
    let newOtpArray = resetOtp.split('');
    while (newOtpArray.length < 6) newOtpArray.push('');
    newOtpArray[index] = value;
    setResetOtp(newOtpArray.join(''));

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !resetOtp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (resetOtp.length !== 6) {
      return setResetError('Please enter a 6-digit OTP code');
    }
    setResetError('');
    setResetStep(3);
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!resetEmail || !resetRole) {
      return setResetError('Please provide email and role');
    }
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim(), role: resetRole })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to request reset OTP');
      }
      setResetSuccess('');
      setTimeLeft(600);
      setResetStep(2);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      return setResetError('Please fill in all fields');
    }
    if (newPassword.length < 6) {
      return setResetError('Password must be at least 6 characters long');
    }
    if (newPassword !== confirmNewPassword) {
      return setResetError('Passwords do not match');
    }

    setResetError('');
    setResetSuccess('');
    setResetLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          role: resetRole,
          otp: resetOtp.trim(),
          newPassword
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }
      setResetSuccess(data.message || 'Password successfully reset!');
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
        setResetOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setResetStep(1);
        setMockOtpToShow('');
        setResetSuccess('');
      }, 2000);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !role) {
      return setError('Please fill in all fields');
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return setError('Please enter a valid email address');
    }

    setError('');
    setLoading(true);

    try {
      sessionStorage.setItem('justLoggedIn', 'true');
      await login(email.trim(), password, role);
    } catch (err) {
      setError(err.message || 'Incorrect email, password, or role');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'advisor', title: 'Batch Advisor' },
    { id: 'admin', title: 'HOD' },
    { id: 'academic_admin', title: 'Administrator' },
    { id: 'super_admin', title: 'Super Admin' },
  ];

  const features = [
    {
      icon: TrendingUp,
      title: 'Real-Time CGPA Monitoring',
      desc: 'Automated alerts for at-risk students'
    },
    {
      icon: Layers,
      title: 'Digital Approval Workflows',
      desc: 'Advisor → HOD hierarchical routing'
    },
    {
      icon: Cpu,
      title: 'AI Academic Risk Prediction',
      desc: 'ML-powered student performance insights'
    },
    {
      icon: Calendar,
      title: 'Constraint-Based Scheduling',
      desc: 'Clash-free timetable generation'
    }
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row font-sans selection:bg-blue-600 selection:text-white bg-slate-50 w-full">
      
      {/* Left Panel: Feature Highlights */}
      <div className="w-full md:w-[45%] bg-slate-900 text-white flex flex-col justify-center px-8 xl:px-12 py-16 relative overflow-hidden shrink-0">
        {/* Decorative background gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-blue-900/20 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[150px] pointer-events-none" />

        <div className="relative z-10 max-w-md mx-auto w-full flex flex-col items-center">
          
          {/* Logo cap */}
          <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
            <GraduationCap className="h-9 w-9 text-white" />
          </div>
          
          <h1 className="text-3xl font-black tracking-tight text-white mb-2 font-display">
            BatchMinder
          </h1>
          <p className="text-slate-400 text-sm text-center mb-12 font-medium">
            AI-Assisted Batch Advisor & Smart Academic Management
          </p>

          {/* Stack of Feature Cards */}
          <div className="w-full space-y-4">
            {features.map((f, i) => {
              const IconComp = f.icon;
              return (
                <div 
                  key={i} 
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                >
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-355 shrink-0 border border-white/5">
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{f.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
        </div>
      </div>

      {/* Right Panel: Welcome and Login Form */}
      <div className="flex-1 bg-white flex flex-col justify-center px-6 sm:px-16 py-16 relative">
        <div className="max-w-md w-full mx-auto space-y-8 select-none">
          
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Welcome Back
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              Sign in to access your BatchMinder portal
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span className="font-semibold leading-normal">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Roles Segmented Controls */}
            <div className="space-y-2.5">
              <div className="bg-slate-100 p-1 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1 border border-slate-200/40">
                {roles.map((r) => {
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`py-2.5 px-1 text-xs rounded-xl text-center font-bold transition-all duration-200 outline-none focus:outline-none ${
                        isSelected
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {r.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email Address */}
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

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email || '');
                    setResetRole(role || 'advisor');
                    setResetStep(1);
                    setResetError('');
                    setResetSuccess('');
                    setShowResetModal(true);
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline border-none bg-transparent cursor-pointer p-0"
                >
                  Forgot Password?
                </button>
              </div>
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
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Sign In Trigger */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <CircularProgress size={16} color="inherit" />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In to BatchMinder'
              )}
            </button>
          </form>

          {/* OR Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-slate-200 w-full" />
            <span className="absolute px-3 bg-white text-xs font-bold text-slate-400 tracking-widest uppercase">
              OR
            </span>
          </div>

          {/* SSO Button */}
          <button 
            type="button"
            className="w-full py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.99] font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-200"
          >
            <Monitor className="h-5 w-5 text-slate-555" />
            <span>Continue with University SSO</span>
          </button>

          {/* Secured Banner */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/30 text-blue-800 text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle className="h-5 w-5 text-blue-600 shrink-0" />
            <span>Secured with Firebase Authentication • Role-Based Access Control enforced</span>
          </div>

        </div>
      </div>

      {/* Password Recovery Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden relative p-6 sm:p-8 space-y-6">
            
            {/* Modal Title & Close */}
            <div className="flex justify-between items-start pb-2">
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (resetStep > 1) setResetStep(resetStep - 1);
                    else setShowResetModal(false);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-6 cursor-pointer border-none bg-transparent"
                >
                  &lt; Back {resetStep === 1 && 'to Login'}
                </button>
                <div className="flex items-center justify-between max-w-[280px] mx-auto mb-8 relative px-2">
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-100 -z-10 -translate-y-1/2"></div>
                  
                  {/* Step 1 */}
                  <div className="flex items-center gap-2 bg-white pr-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${resetStep >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {resetStep > 1 ? '✓' : '1'}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${resetStep >= 1 ? 'text-emerald-600' : 'text-slate-400'}`}>Email</span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-2 bg-white px-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${resetStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {resetStep > 2 ? '✓' : '2'}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${resetStep >= 2 ? 'text-blue-700' : 'text-slate-400'}`}>Verify OTP</span>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-2 bg-white pl-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${resetStep === 3 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      3
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${resetStep === 3 ? 'text-slate-800' : 'text-slate-400'}`}>New Password</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications / Errors */}
            {resetError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}
            {resetSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-2.5">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {resetStep === 1 && (
              /* Step 1: Request OTP Form */
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900">Forgot Password</h3>
                  <p className="text-sm text-slate-500">Enter your email and role to receive a recovery code.</p>
                </div>
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Role in BatchMinder
                    </label>
                    <div className="bg-slate-100 p-1 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1 border border-slate-200/40">
                      {roles.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setResetRole(r.id)}
                          className={`py-2 px-1 text-[11px] rounded-xl text-center font-bold transition-all duration-200 outline-none focus:outline-none cursor-pointer ${
                            resetRole === r.id
                              ? 'bg-white text-blue-600 shadow-sm'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {r.title}
                        </button>
                      ))}
                    </div>
                  </div>

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
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="batchadvisor@stmu.edu.pk"
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3.5 mt-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </form>
              </div>
            )}

            {resetStep === 2 && (
              /* Step 2: Enter OTP Form */
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900">Verify Your Identity</h3>
                  <p className="text-sm text-slate-500">A 6-digit verification code has been sent to your institutional email address. Please enter it below to continue.</p>
                </div>
                
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                    OTP sent to <strong>{getMaskedEmail()}</strong>. Check your inbox and spam folder. Code expires in 10 minutes.
                  </p>
                </div>

                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${timeLeft <= 60 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-orange-50 text-orange-600 border-orange-200'} border`}>
                  <Clock className="w-3.5 h-3.5" />
                  Code expires in {formatTime(timeLeft)}
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 text-center">
                      Enter 6-Digit OTP Code
                    </label>
                    <div className="flex justify-center gap-2 sm:gap-3">
                      {[...Array(6)].map((_, i) => (
                        <input
                          key={i}
                          id={`otp-${i}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={resetOtp[i] || ''}
                          onChange={(e) => handleOtpChange(e, i)}
                          onKeyDown={(e) => handleOtpKeyDown(e, i)}
                          className="w-10 h-12 sm:w-12 sm:h-14 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-slate-800 text-center tracking-widest text-lg sm:text-2xl font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 shadow-sm"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetOtp.length !== 6 || timeLeft === 0}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
                  >
                    Verify & Continue
                  </button>
                  
                  <div className="text-center mt-4 text-xs font-medium text-slate-500">
                    Didn't receive the code? <button type="button" onClick={handleRequestOtp} className="text-blue-600 font-bold hover:underline cursor-pointer bg-transparent border-none">Resend OTP</button> · <button type="button" onClick={() => setResetStep(1)} className="text-blue-600 font-bold hover:underline cursor-pointer bg-transparent border-none">Change Email</button>
                  </div>
                </form>
              </div>
            )}

            {resetStep === 3 && (
              /* Step 3: New Password Form */
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-slate-800 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-slate-800/20">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900">Set New Password</h3>
                  <p className="text-sm text-slate-500">Your identity has been verified. You may now securely set a new password.</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all duration-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Repeat new password"
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-800 focus:ring-4 focus:ring-slate-800/5 outline-none transition-all duration-200 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex justify-center items-center gap-2 mt-2 cursor-pointer"
                  >
                    {resetLoading ? 'Updating Password...' : 'Update Password & Login'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
      
    </div>
  );
}
