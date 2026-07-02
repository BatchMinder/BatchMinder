import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import { 
  Layers, 
  Github,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Shield,
  Clock,
  BookOpen,
  Calendar,
  AlertCircle
} from 'lucide-react';

function App() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState('login');
  
  // Dashboard states
  const [backendStatus, setBackendStatus] = useState('checking');
  const [latency, setLatency] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  
  // Logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const checkHealth = async () => {
    setBackendStatus('checking');
    const startTime = Date.now();
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        setBackendStatus('online');
        setLatency(Date.now() - startTime);
      } else {
        setBackendStatus('offline');
        setLatency(null);
      }
    } catch (error) {
      setBackendStatus('offline');
      setLatency(null);
    }
  };

  const fetchAuditLogs = async () => {
    const activeToken = localStorage.getItem('token');
    if (!activeToken) return;
    
    setLogsLoading(true);
    setLogsError('');
    try {
      const response = await fetch('/api/auth/audit-logs', {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      const resData = await response.json();
      if (response.ok) {
        setAuditLogs(resData.data.logs || []);
      } else {
        setLogsError(resData.message || 'Failed to fetch logs');
      }
    } catch (err) {
      setLogsError('Network error reading audit logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAuditLogs();
    }
  }, [user]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-100 blur-[120px] pointer-events-none" />
        <div className="relative flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6 animate-pulse">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
            <span className="text-slate-500 text-sm font-semibold tracking-wider uppercase">Loading BatchMinder...</span>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard (Authenticated View)
  if (user) {
    const roleColors = {
      admin: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      advisor: 'text-blue-600 bg-blue-50 border-blue-200',
      academic_admin: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    };

    const roleLabels = {
      admin: 'HOD / Admin',
      advisor: 'Batch Advisor',
      academic_admin: 'Academic Admin'
    };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-500 selection:text-white relative overflow-hidden font-sans">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-100/40 blur-[120px] pointer-events-none" />

        {/* Dashboard Header */}
        <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 pr-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 font-display">
                BatchMinder Portal
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-slate-200">
                <div className="text-right">
                  <h4 className="text-sm font-semibold text-slate-800 font-sans">{user.name}</h4>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${roleColors[user.role]}`}>
                  {roleLabels[user.role]}
                </span>
              </div>
              <button 
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-2 text-slate-500 hover:text-red-600 text-sm font-medium transition-colors focus:outline-none"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Dashboard Space */}
        <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full grid lg:grid-cols-12 gap-8 z-10">
          
          {/* Left Panel: Overview and Module Status */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Welcome Banner */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="absolute right-4 top-4 text-slate-100 pointer-events-none">
                <Shield className="h-20 w-20" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2 font-display">Welcome Back, {user.name.split(' ')[0]}!</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                Your role provides full access to the Advisory Portal. Use the navigation panel below to view timetables, request approvals, and configure batch actions.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="h-4 w-4" /> Logged in session active
              </div>
            </div>

            {/* Quick Metrics Stubs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Students Managed</span>
                <h3 className="text-3xl font-extrabold text-blue-600 mt-1 font-display">142</h3>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Pending Approvals</span>
                <h3 className="text-3xl font-extrabold text-indigo-600 mt-1 font-display">7</h3>
              </div>
            </div>

            {/* Module Index */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">BatchMinder Modules</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4.5 w-4.5" />
                    <span className="text-sm font-semibold">Module 1: Auth & RBAC</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-emerald-200">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-400">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4.5 w-4.5" />
                    <span className="text-sm">Module 2: CGPA & Risk Prediction</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200">Soon</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-400">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4.5 w-4.5" />
                    <span className="text-sm">Module 3: Timetable Scheduling</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200">Soon</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Live System Audit Logs & Health */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Server Connection Panel */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Connection Health</h3>
                <button 
                  onClick={checkHealth}
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors border border-slate-200 focus:outline-none"
                >
                  <RefreshCw className={`h-4 w-4 ${backendStatus === 'checking' ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-200">
                <span className="text-sm text-slate-700 font-medium">Express API Gateway</span>
                {backendStatus === 'online' ? (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle className="h-3 w-3" /> Online {latency ? `(${latency}ms)` : ''}
                  </span>
                ) : backendStatus === 'checking' ? (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Checking
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" /> Offline
                  </span>
                )}
              </div>
            </div>

            {/* Audit Logs panel */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Database Audit Logs</h3>
                <button 
                  onClick={fetchAuditLogs}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 transition-colors focus:outline-none"
                >
                  <RefreshCw className={`h-3 w-3 ${logsLoading ? 'animate-spin' : ''}`} /> Reload
                </button>
              </div>

              {/* Logs Content container */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {logsLoading && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Retrieving database logs...
                  </div>
                )}
                
                {logsError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span>{logsError} (Logs only queryable by Admins/Advisors)</span>
                  </div>
                )}

                {!logsLoading && !logsError && auditLogs.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No database logs recorded yet.
                  </div>
                )}

                {!logsLoading && !logsError && auditLogs.map((log) => (
                  <div key={log._id} className="p-3 rounded-lg bg-slate-50/50 border border-slate-200/80 hover:border-slate-300/80 transition-colors text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase text-[10px] border border-blue-100">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-450">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-normal">{log.description}</p>
                    {log.userId?.name && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-0.5 border-t border-slate-200">
                        <UserIcon className="h-3 w-3 text-slate-400" /> {log.userId.name} ({log.userId.email})
                      </div>
                    )}
                    {!log.userId && log.userEmail && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-0.5 border-t border-slate-200">
                        <UserIcon className="h-3 w-3 text-slate-400" /> Anonymous ({log.userEmail})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>

        {/* Custom Logout Confirmation Modal */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.15)] animate-in fade-in zoom-in-95 duration-250 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-4 border border-red-100">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 font-display">Confirm Log Out</h3>
              <p className="text-slate-500 text-sm mb-6 leading-normal">
                Are you sure you want to end your BatchMinder advisory session?
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutModal(false);
                    logout();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-md shadow-red-500/10 focus:outline-none"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-6 mt-12">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <div>
              &copy; {new Date().getFullYear()} BatchMinder. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <span className="hover:text-slate-600 cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-slate-600 cursor-pointer transition-colors">Terms of Service</span>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500 hover:text-slate-700 transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Guest View (Login / Signup Forms)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background blobs for premium depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-100/40 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Layers className="h-5 w-5 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-display">
              BatchMinder
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 shadow-sm">
              v1.0.0
            </span>
          </div>
        </div>
      </header>

      {/* Main Body with Forms */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center items-center w-full z-10">
        {view === 'login' ? (
          <Login setView={setView} />
        ) : (
          <Signup setView={setView} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div>
            &copy; {new Date().getFullYear()} BatchMinder. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-600 cursor-pointer transition-colors">Terms of Service</span>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-500 hover:text-slate-700 transition-colors">
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
