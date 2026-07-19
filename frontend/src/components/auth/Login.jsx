import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth';
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
  ArrowLeft,
  Key,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { CircularProgress } from '@mui/material';

// Default seed credentials per role for quick demo login
const SEED_CREDENTIALS = {
  advisor: { email: 'advisor.cs@stmu.edu.pk', password: 'password123' },
  admin: { email: 'hod.cs@stmu.edu.pk', password: 'password123' },
  academic_admin: { email: 'admin.cs@stmu.edu.pk', password: 'password123' },
  dean: { email: 'dean@stmu.edu.pk', password: 'password123' },
};

const Stepper = ({ currentStep }) => {
  return (
    <div className="w-full max-w-sm mx-auto mb-8 px-2">
      <div className="flex items-center w-full relative">
        {/* Line running behind steps */}
        <div className="absolute left-0 right-0 top-4 h-[2px] bg-slate-200 -translate-y-1/2 z-0" />
        <div
          className="absolute left-0 top-4 h-[2px] bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
        />

        <div className="flex justify-between w-full relative z-10">
          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${currentStep > 1
              ? 'bg-emerald-500 text-white'
              : 'bg-blue-600 text-white ring-4 ring-blue-500/10'
              }`}>
              {currentStep > 1 ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : '1'}
            </div>
            <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider transition-colors duration-300 ${currentStep >= 1 ? 'text-slate-800' : 'text-slate-400'
              }`}>
              Email
            </span>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${currentStep > 2
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : currentStep === 2
                ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-500/10'
                : 'bg-white border-slate-200 text-slate-400'
              }`}>
              {currentStep > 2 ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : '2'}
            </div>
            <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider transition-colors duration-300 ${currentStep >= 2 ? 'text-slate-800' : 'text-slate-400'
              }`}>
              Verify OTP
            </span>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${currentStep === 3
              ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-500/10'
              : 'bg-white border-slate-200 text-slate-400'
              }`}>
              3
            </div>
            <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider transition-colors duration-300 ${currentStep === 3 ? 'text-slate-800' : 'text-slate-400'
              }`}>
              Password
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Login() {
  const { login, updateUser } = useAuth();
  const [email, setEmail] = useState(SEED_CREDENTIALS.advisor.email);
  const [password, setPassword] = useState(SEED_CREDENTIALS.advisor.password);
  const [role, setRole] = useState('advisor');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotRole, setForgotRole] = useState('advisor');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // New recovery flow redesign states
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(600);
  const otpInputRefs = React.useRef([]);

  useEffect(() => {
    if (!isForgotPassword || recoveryStep !== 2 || timerSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isForgotPassword, recoveryStep, timerSeconds]);

  const maskEmail = (emailStr) => {
    if (!emailStr) return '';
    const [localPart, domain] = emailStr.split('@');
    if (!localPart || !domain) return emailStr;
    if (localPart.length <= 4) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.substring(0, 4)}****@${domain}`;
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value, index) => {
    const newOtpValues = [...otpValues];
    const cleanValue = value.replace(/\D/g, '');
    newOtpValues[index] = cleanValue;
    setOtpValues(newOtpValues);

    if (cleanValue !== '' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (otpValues[index] === '' && index > 0) {
        const newOtpValues = [...otpValues];
        newOtpValues[index - 1] = '';
        setOtpValues(newOtpValues);
        otpInputRefs.current[index - 1]?.focus();
      } else {
        const newOtpValues = [...otpValues];
        newOtpValues[index] = '';
        setOtpValues(newOtpValues);
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);
    const newOtpValues = [...otpValues];
    for (let i = 0; i < 6; i++) {
      newOtpValues[i] = pastedData[i] || '';
    }
    setOtpValues(newOtpValues);
    const focusIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleForgotPasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail || !forgotRole) {
      return setForgotError('Please enter your email and select your role');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail.trim())) {
      return setForgotError('Please enter a valid email address');
    }

    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      await authService.forgotPassword(forgotEmail.trim(), forgotRole);
      setForgotSuccess('Verification code has been sent successfully. Check your email inbox (or console logs).');
      setShowOtpVerification(true);
      setRecoveryStep(2);
      setTimerSeconds(600);
      setOtpValues(['', '', '', '', '', '']);
    } catch (err) {
      setForgotError(err.message || 'Failed to request recovery code. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpStr = otpValues.join('');
    if (!otpStr || !newPassword || !confirmPassword) {
      return setOtpError('Please fill in all fields.');
    }
    if (otpStr.length !== 6) {
      return setOtpError('OTP must be exactly 6 digits.');
    }
    if (newPassword.length < 6) {
      return setOtpError('New password must be at least 6 characters.');
    }
    if (newPassword !== confirmPassword) {
      return setOtpError('Passwords do not match.');
    }

    setOtpError('');
    setOtpSuccess(false);
    setOtpLoading(true);

    try {
      const user = await authService.resetPassword(otpStr, forgotEmail.trim(), forgotRole, newPassword);
      setOtpSuccess(true);
      localStorage.setItem('isLoggedIn', 'true');
      setTimeout(() => {
        updateUser(user);
        window.history.replaceState(null, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 2000);
    } catch (err) {
      setOtpError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setOtpLoading(false);
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
    { id: 'dean', title: 'Dean' },
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

  if (isForgotPassword) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F172A] flex flex-col justify-center items-center py-12 px-4 selection:bg-blue-600 selection:text-white font-sans">
        {/* Ambient background glows */}
        <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-blue-900/20 blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[150px] pointer-events-none" />

        {/* Star/dot pattern layer */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #94a3b8 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* The Card */}
        <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100/50 flex flex-col select-none">
          {/* Stepper */}
          <Stepper currentStep={recoveryStep} />

          {recoveryStep === 1 && (
            <>
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setForgotError('');
                  setForgotSuccess('');
                  setError('');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider mb-6 border-none bg-transparent cursor-pointer p-0 w-fit"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </button>

              <div className="w-16 h-16 bg-blue-50/50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Key className="h-8 w-8" />
              </div>

              <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-2 font-display">
                Account Recovery
              </h2>
              <p className="text-slate-500 text-sm text-center mb-6 max-w-sm mx-auto font-medium">
                Enter your email address and select your role to receive a verification code
              </p>

              {forgotError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-start gap-3 mb-5">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-normal">{forgotError}</span>
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">

                {/* Roles Segmented Controls */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Select Your Account Role
                  </label>
                  <div className="bg-slate-100 p-1 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1 border border-slate-200/40">
                    {roles.map((r) => {
                      const isSelected = forgotRole === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setForgotRole(r.id)}
                          className={`py-2.5 px-1 text-xs rounded-xl text-center font-bold transition-all duration-200 outline-none focus:outline-none ${isSelected
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
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="batchadvisor@stmu.edu.pk"
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-sm"
                    />
                  </div>
                </div>

                {/* Send Reset Email Trigger */}
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 border-none cursor-pointer"
                >
                  {forgotLoading ? (
                    <>
                      <CircularProgress size={16} color="inherit" />
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    'Request Recovery Code'
                  )}
                </button>
              </form>
            </>
          )}

          {recoveryStep === 2 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setRecoveryStep(1);
                  setShowOtpVerification(false);
                  setForgotSuccess('');
                  setForgotError('');
                  setOtpError('');
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider mb-6 border-none bg-transparent cursor-pointer p-0 w-fit"
              >
                <ArrowLeft className="h-4 w-4" /> Change Email / Role
              </button>

              <div className="w-16 h-16 bg-blue-50/50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <ShieldCheck className="h-8 w-8" />
              </div>

              <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-2 font-display">
                Verify Your Identity
              </h2>
              <p className="text-slate-500 text-sm text-center mb-6 max-w-sm mx-auto font-medium">
                A 6-digit verification code has been sent to your institutional email address. Please enter it below to continue.
              </p>

              {forgotSuccess && !otpError && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-start gap-3 mb-4 text-left">
                  <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="font-semibold leading-normal">
                    OTP sent to <span className="font-bold">{maskEmail(forgotEmail)}</span>. Check your inbox and spam folder. Code expires in 10 minutes.
                  </span>
                </div>
              )}

              <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 w-fit mx-auto mb-6 border transition-all duration-300 ${timerSeconds <= 0
                ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse'
                : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  {timerSeconds <= 0 ? 'Code expired' : `Code expires in ${formatTime(timerSeconds)}`}
                </span>
              </div>

              {otpError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-start gap-3 mb-5">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-normal">{otpError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 text-center mb-3">
                  Enter 6-Digit OTP Code
                </label>
                <div className="flex justify-between gap-2 sm:gap-3 max-w-sm mx-auto mb-6" onPaste={handleOtpPaste}>
                  {otpValues.map((value, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      value={value}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black text-slate-800 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 focus:outline-none transition-all bg-slate-50/50"
                      required
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={otpValues.join('').length !== 6 || timerSeconds <= 0}
                onClick={() => setRecoveryStep(3)}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 border-none cursor-pointer mb-5"
              >
                <span>Verify & Continue</span>
              </button>

              <div className="text-center text-xs text-slate-500 font-semibold">
                <span>Didn't receive the code? </span>
                <button
                  type="button"
                  onClick={() => handleForgotPasswordSubmit()}
                  disabled={forgotLoading}
                  className="text-blue-600 font-extrabold hover:underline border-none bg-transparent cursor-pointer p-0 disabled:opacity-50 inline"
                >
                  {forgotLoading ? 'Resending...' : 'Resend OTP'}
                </button>
                <span className="text-slate-300 mx-2">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryStep(1);
                    setShowOtpVerification(false);
                    setForgotSuccess('');
                    setForgotError('');
                    setOtpError('');
                  }}
                  className="text-blue-600 font-extrabold hover:underline border-none bg-transparent cursor-pointer p-0 inline"
                >
                  Change Email
                </button>
              </div>
            </>
          )}

          {recoveryStep === 3 && (
            <>
              <button
                type="button"
                onClick={() => setRecoveryStep(2)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider mb-6 border-none bg-transparent cursor-pointer p-0 w-fit"
              >
                <ArrowLeft className="h-4 w-4" /> Back to OTP Code
              </button>

              <div className="w-16 h-16 bg-blue-50/50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Lock className="h-8 w-8" />
              </div>

              <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-2 font-display">
                Choose New Password
              </h2>
              <p className="text-slate-500 text-sm text-center mb-6 max-w-sm mx-auto font-medium">
                Please enter and confirm your new account password to complete recovery.
              </p>

              {otpError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-start gap-3 mb-5">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-normal">{otpError}</span>
                </div>
              )}

              {otpSuccess ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm flex flex-col items-center gap-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-emerald-900">Password Reset Successful!</h4>
                    <p className="text-emerald-600 text-xs mt-1">
                      Logging you directly into the BatchMinder portal dashboard...
                    </p>
                  </div>
                  <CircularProgress size={20} className="text-emerald-600 mt-2" />
                </div>
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex flex-col gap-0.5">
                    <div><span className="font-bold">Email: </span>{forgotEmail}</div>
                    <div><span className="font-bold">Role: </span>{roles.find(r => r.id === forgotRole)?.title || forgotRole}</div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Choose New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none border-none bg-transparent"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
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
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-sm"
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

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 border-none cursor-pointer"
                  >
                    {otpLoading ? (
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
          )}

          {/* Secured Banner */}
          <div className="mt-6 p-4 rounded-2xl bg-blue-50/60 border border-blue-100/30 text-blue-800 text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle className="h-5 w-5 text-blue-600 shrink-0" />
            <span>Secured with JWT Authentication • Role-Based Access Control enforced</span>
          </div>

        </div>
      </div>
    );
  }

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

      {/* Right Panel: Welcome and Login Form / Forgot Password Form */}
      <div className="flex-1 bg-white flex flex-col justify-center px-6 sm:px-16 py-16 relative">
        <div className="max-w-md w-full mx-auto space-y-8 select-none">

          {!isForgotPassword ? (
            <>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
                  Welcome Back
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  Sign in to access your BatchMinder portal
                </p>
              </div>

              {
                error && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <span className="font-semibold leading-normal">{error}</span>
                  </div>
                )
              }

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
                          onClick={() => {
                            setRole(r.id);
                            const creds = SEED_CREDENTIALS[r.id];
                            if (creds) {
                              setEmail(creds.email);
                              setPassword(creds.password);
                            }
                          }}
                          className={`py-2.5 px-1 text-xs rounded-xl text-center font-bold transition-all duration-200 outline-none focus:outline-none ${isSelected
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
                        setIsForgotPassword(true);
                        setError('');
                        setForgotError('');
                        setForgotSuccess('');
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
            </>
          ) : (
            <>
              {!showOtpVerification ? (
                <>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setForgotError('');
                        setForgotSuccess('');
                        setError('');
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider mb-2 border-none bg-transparent cursor-pointer p-0"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back to Login
                    </button>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
                      Account Recovery
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                      Enter your email and role to receive a recovery code
                    </p>
                  </div>

                  {forgotError && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      <span className="font-semibold leading-normal">{forgotError}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">

                    {/* Roles Segmented Controls */}
                    <div className="space-y-2.5">
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        Select Your Account Role
                      </label>
                      <div className="bg-slate-100 p-1 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1 border border-slate-200/40">
                        {roles.map((r) => {
                          const isSelected = forgotRole === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setForgotRole(r.id)}
                              className={`py-2.5 px-1 text-xs rounded-xl text-center font-bold transition-all duration-200 outline-none focus:outline-none ${isSelected
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
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="batchadvisor@stmu.edu.pk"
                          required
                          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-sm"
                        />
                      </div>
                    </div>

                    {/* Send Reset Email Trigger */}
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 border-none cursor-pointer"
                    >
                      {forgotLoading ? (
                        <>
                          <CircularProgress size={16} color="inherit" />
                          <span>Sending Code...</span>
                        </>
                      ) : (
                        'Request Recovery Code'
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtpVerification(false);
                        setForgotSuccess('');
                        setForgotError('');
                        setOtpError('');
                        setOtpSuccess(false);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider mb-2 border-none bg-transparent cursor-pointer p-0"
                    >
                      <ArrowLeft className="h-4 w-4" /> Change Email / Role
                    </button>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
                      Enter Recovery Code
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                      Type the 6-digit OTP code sent to your email
                    </p>
                  </div>

                  {forgotSuccess && !otpError && !otpSuccess && (
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 text-xs flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-blue-600" />
                      <span className="font-semibold leading-normal">{forgotSuccess}</span>
                    </div>
                  )}

                  {otpError && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      <span className="font-semibold leading-normal">{otpError}</span>
                    </div>
                  )}

                  {otpSuccess ? (
                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm flex flex-col items-center gap-4 text-center">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce">
                        <CheckCircle className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-emerald-900">Password Reset Successful!</h4>
                        <p className="text-emerald-600 text-xs mt-1">
                          Logging you directly into the BatchMinder portal dashboard...
                        </p>
                      </div>
                      <CircularProgress size={20} className="text-emerald-600 mt-2" />
                    </div>
                  ) : (
                    <form onSubmit={handleOtpSubmit} className="space-y-5">

                      {/* Account Details Banner */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex flex-col gap-0.5">
                        <div><span className="font-bold">Email: </span>{forgotEmail}</div>
                        <div><span className="font-bold">Role: </span>{roles.find(r => r.id === forgotRole)?.title || forgotRole}</div>
                      </div>

                      {/* 6-Digit OTP Box */}
                      <div className="space-y-2">
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                          6-Digit OTP Code
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
                          Choose New Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Lock className="h-5 w-5" />
                          </div>
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••••••"
                            required
                            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none border-none bg-transparent"
                          >
                            {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
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
                            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/80 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all duration-200 text-sm"
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

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={otpLoading}
                        className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 border-none cursor-pointer"
                      >
                        {otpLoading ? (
                          <>
                            <CircularProgress size={16} color="inherit" />
                            <span>Verifying & Resetting...</span>
                          </>
                        ) : (
                          'Verify OTP & Reset Password'
                        )}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={handleForgotPasswordSubmit}
                          disabled={forgotLoading}
                          className="text-xs font-bold text-blue-600 hover:underline border-none bg-transparent cursor-pointer p-0 disabled:opacity-50"
                        >
                          {forgotLoading ? 'Resending Code...' : 'Resend Verification Code'}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </>
          )}

          {/* Secured Banner */}
          < div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/30 text-blue-800 text-xs font-semibold flex items-center gap-2.5" >
            <CheckCircle className="h-5 w-5 text-blue-600 shrink-0" />
            <span>Secured with JWT Authentication • Role-Based Access Control enforced</span>
          </div >

        </div >
      </div >



    </div >
  );
}