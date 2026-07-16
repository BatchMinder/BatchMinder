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
  GraduationCap
} from 'lucide-react';
import { CircularProgress } from '@mui/material';

// Default seed credentials per role for quick demo login
const SEED_CREDENTIALS = {
  advisor:       { email: 'advisor.cs@stmu.edu.pk', password: 'password123' },
  admin:         { email: 'hod.cs@stmu.edu.pk',      password: 'password123' },
  academic_admin:{ email: 'admin.cs@stmu.edu.pk',     password: 'password123' },
  super_admin:   { email: 'dean@stmu.edu.pk',         password: 'password123' },
};

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState(SEED_CREDENTIALS.advisor.email);
  const [password, setPassword] = useState(SEED_CREDENTIALS.advisor.password);
  const [role, setRole] = useState('advisor');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


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
    { id: 'super_admin', title: 'Dean' },
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
                      onClick={() => {
                        setRole(r.id);
                        const creds = SEED_CREDENTIALS[r.id];
                        if (creds) {
                          setEmail(creds.email);
                          setPassword(creds.password);
                        }
                      }}
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


      
    </div>
  );
}
