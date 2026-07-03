import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import RecordsDirectory from './pages/RecordsDirectory';
import DataIngestionHub from './pages/DataIngestionHub';
import CurriculumBoard from './pages/CurriculumBoard';
import MigrationManager from './pages/MigrationManager';
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
  AlertCircle,
  Database
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button as MuiButton,
  CircularProgress
} from '@mui/material';

function App() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState('login');
  const [activeTab, setActiveTab] = useState('overview');

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
      const response = await fetch('/api/auth/audit-logs');
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

  // Loading Screen using Material UI CircularProgress
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-100 blur-[120px] pointer-events-none" />
        <div className="relative flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-brandNavy to-brandAccent flex items-center justify-center shadow-lg shadow-brandNavy/20 mb-6 animate-pulse">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <div className="flex items-center gap-2.5">
            <CircularProgress size={16} className="text-brandNavy" />
            <span className="text-slate-600 text-sm font-semibold tracking-wider uppercase">Loading BatchMinder...</span>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard (Authenticated View)
  if (user) {
    // Role styling matching palette
    const roleColors = {
      admin: 'text-brandNavy bg-brandNavy/5 border-brandNavy/20',
      advisor: 'text-brandAccent bg-brandAccent/5 border-brandAccent/20',
      academic_admin: 'text-alertGood bg-alertGood/5 border-alertGood/20'
    };

    const roleLabels = {
      admin: 'HOD / Admin',
      advisor: 'Batch Advisor',
      academic_admin: 'Academic Admin'
    };

    return (
      <div className="h-screen bg-slate-50 text-slate-800 flex selection:bg-brandNavy selection:text-white relative overflow-hidden font-sans">
        {/* Background blobs for premium depth */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-100/40 blur-[120px] pointer-events-none z-0" />

        {/* Sidebar Component (UI-3) */}
        <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen z-40 shrink-0 select-none shadow-sm">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brandNavy to-brandAccent flex items-center justify-center shadow-md shadow-brandNavy/10">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 font-display">
                BatchMinder
              </span>
            </div>

            {/* Profile widget in sidebar */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
              <div>
                <h4 className="text-sm font-bold text-slate-800">{user.name}</h4>
                <p className="text-xs text-slate-500 truncate font-medium">{user.email}</p>
              </div>
              <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-200 text-xs">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Assigned Batch</span>
                <span className="font-bold text-brandNavy">CS Batch 2022</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase text-center block mt-1.5 ${roleColors[user.role]}`}>
                  {roleLabels[user.role]}
                </span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="space-y-1">
              {[
                { id: 'overview', label: 'Dashboard Overview', icon: Layers },
                { id: 'directory', label: 'Records Directory', icon: UserIcon },
                { id: 'ingestion', label: 'Data Ingestion Hub', icon: Database },
                { id: 'curriculum', label: 'Curriculum Board', icon: BookOpen },
                { id: 'migration', label: 'Migration Manager', icon: RefreshCw }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none ${isActive
                      ? 'bg-brandNavy text-white shadow-md shadow-brandNavy/15'
                      : 'text-slate-500 hover:text-brandNavy hover:bg-slate-50'
                      }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Logout button inside sidebar */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-alertCritical hover:bg-alertCritical/5 transition-all focus:outline-none"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col justify-between h-screen min-w-0 overflow-y-auto overflow-x-hidden z-10">

          {/* Main Top Header */}
          <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <span className="text-lg font-bold tracking-tight text-slate-800 uppercase text-xs font-semibold tracking-wider text-slate-400">
                Advisory Workspace / {activeTab === 'overview' ? 'Overview' : activeTab === 'directory' ? 'Student Directory' : activeTab === 'ingestion' ? 'Ingestion Hub' : activeTab === 'curriculum' ? 'Curriculum' : 'Migration'}
              </span>

              {/* Connection Status indicator inside Header */}
              <div className="flex items-center gap-3">
                {backendStatus === 'online' ? (
                  <span className="text-xs font-bold text-alertGood bg-alertGood/5 px-2.5 py-1 rounded-full border border-alertGood/20 flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle className="h-3.5 w-3.5" /> Online {latency ? `(${latency}ms)` : ''}
                  </span>
                ) : backendStatus === 'checking' ? (
                  <span className="text-xs font-bold text-alertWarning bg-alertWarning/5 px-2.5 py-1 rounded-full border border-alertWarning/20 flex items-center gap-1.5">
                    <CircularProgress size={8} color="inherit" /> Checking API
                  </span>
                ) : (
                  <span className="text-xs font-bold text-alertCritical bg-alertCritical/5 px-2.5 py-1 rounded-full border border-alertCritical/20 flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="h-3.5 w-3.5" /> API Offline
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* Router views mounting point */}
          <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
            {activeTab === 'overview' && (
              <div className="grid lg:grid-cols-12 gap-8">

                {/* Left Panel: Overview and Module Status */}
                <div className="lg:col-span-6 space-y-6">
                  {/* Welcome Banner */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden font-sans">
                    <div className="absolute right-4 top-4 text-slate-100 pointer-events-none">
                      <Shield className="h-20 w-20" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-2 font-display font-sans">Welcome Back, {user.name.split(' ')[0]}!</h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                      Your role provides full access to the Advisory Portal. Use the navigation panel below to view timetables, request approvals, and configure batch actions.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
                      <Clock className="h-5 w-5" /> Logged in session active
                    </div>
                  </div>

                  {/* Quick Metrics Stubs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm font-sans">
                      <span className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Students Managed</span>
                      <h3 className="text-3xl font-extrabold text-brandNavy mt-1 font-display">142</h3>
                    </div>
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm font-sans">
                      <span className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Pending Approvals</span>
                      <h3 className="text-3xl font-extrabold text-brandAccent mt-1 font-display">7</h3>
                    </div>
                  </div>

                  {/* Module Index */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm font-sans">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">BatchMinder Modules</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-alertGood/5 border border-alertGood/25 text-alertGood">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5" />
                          <span className="text-sm font-semibold">Module 1: Auth & RBAC</span>
                        </div>
                        <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-white border border-alertGood/30">Active</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-alertGood/5 border border-alertGood/25 text-alertGood">
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-5 w-5" />
                          <span className="text-sm font-semibold">Module 2: Ingestion & Student Records</span>
                        </div>
                        <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-white border border-alertGood/30">Active</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-400">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5" />
                          <span className="text-sm">Module 3: Timetable Scheduling</span>
                        </div>
                        <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200">Soon</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Live System Audit Logs & Health */}
                <div className="lg:col-span-6 space-y-6">

                  {/* Connection Health Manual trigger */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm font-sans">
                    <div className="flex items-center justify-between mb-4 font-sans">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Connection Health</h3>
                      <button
                        onClick={checkHealth}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-brandAccent transition-colors border border-slate-200 focus:outline-none"
                      >
                        <RefreshCw className={`h-4 w-4 ${backendStatus === 'checking' ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-200 font-sans">
                      <span className="text-sm text-slate-700 font-semibold">Express API Gateway</span>
                      {backendStatus === 'online' ? (
                        <span className="text-sm font-bold text-alertGood bg-alertGood/5 px-2.5 py-1 rounded-full border border-alertGood/20 flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" /> Online {latency ? `(${latency}ms)` : ''}
                        </span>
                      ) : backendStatus === 'checking' ? (
                        <span className="text-sm font-bold text-alertWarning bg-alertWarning/5 px-2.5 py-1 rounded-full border border-alertWarning/20 flex items-center gap-1.5">
                          <CircularProgress size={10} color="inherit" /> Checking
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-alertCritical bg-alertCritical/5 px-2.5 py-1 rounded-full border border-alertCritical/20 flex items-center gap-1.5 animate-pulse">
                          <AlertTriangle className="h-4 w-4" /> Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Audit Logs panel */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex-1 flex flex-col font-sans">
                    <div className="flex items-center justify-between mb-4 font-sans">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Database Audit Logs</h3>
                      <button
                        onClick={fetchAuditLogs}
                        className="text-sm text-brandAccent hover:text-brandAccent/90 font-bold flex items-center gap-1 transition-colors focus:outline-none"
                      >
                        <RefreshCw className={`h-3 w-3 ${logsLoading ? 'animate-spin' : ''}`} /> Reload
                      </button>
                    </div>

                    {/* Logs Content container */}
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {logsLoading && (
                        <div className="py-8 text-center text-sm text-slate-400 flex justify-center items-center gap-2">
                          <CircularProgress size={14} className="text-brandAccent" />
                          <span>Retrieving database logs...</span>
                        </div>
                      )}

                      {logsError && (
                        <div className="p-3 rounded-lg bg-alertCritical/5 border border-alertCritical/10 text-alertCritical text-sm flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          <span>{logsError} (Logs only queryable by Admins/Advisors)</span>
                        </div>
                      )}

                      {!logsLoading && !logsError && auditLogs.length === 0 && (
                        <div className="py-8 text-center text-sm text-slate-400">
                          No database logs recorded yet.
                        </div>
                      )}

                      {!logsLoading && !logsError && auditLogs.map((log) => (
                        <div key={log._id} className="p-3 rounded-lg bg-slate-50/50 border border-slate-200/80 hover:border-slate-300/80 transition-colors text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-brandAccent bg-brandAccent/5 px-2 py-0.5 rounded uppercase text-sm border border-brandAccent/10">
                              {log.action}
                            </span>
                            <span className="text-sm text-slate-400">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-normal text-sm">{log.description}</p>
                          {log.userId?.name && (
                            <div className="text-sm text-slate-400 flex items-center gap-1.5 pt-0.5 border-t border-slate-200">
                              <UserIcon className="h-4 w-4 text-slate-400" /> {log.userId.name} ({log.userId.email})
                            </div>
                          )}
                          {!log.userId && log.userEmail && (
                            <div className="text-sm text-slate-400 flex items-center gap-1.5 pt-0.5 border-t border-slate-200">
                              <UserIcon className="h-4 w-4 text-slate-400" /> Anonymous ({log.userEmail})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {activeTab === 'directory' && <RecordsDirectory />}
            {activeTab === 'ingestion' && <DataIngestionHub />}
            {activeTab === 'curriculum' && <CurriculumBoard />}
            {activeTab === 'migration' && <MigrationManager />}
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200/80 bg-white py-6 mt-12">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
              <div>
                &copy; {new Date().getFullYear()} BatchMinder. All rights reserved.
              </div>
              <div className="flex items-center gap-6">
                <span className="hover:text-slate-600 cursor-pointer transition-colors text-sm">Privacy Policy</span>
                <span className="hover:text-slate-600 cursor-pointer transition-colors text-sm">Terms of Service</span>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition-colors">
                  <Github className="h-5 w-5" />
                </a>
              </div>
            </div>
          </footer>

          {/* Unified Logout Confirmation Dialog */}
          <Dialog
            open={showLogoutModal}
            onClose={() => setShowLogoutModal(false)}
            PaperProps={{
              style: {
                borderRadius: '24px',
                padding: '16px',
                maxWidth: '380px'
              }
            }}
          >
            <DialogTitle style={{ fontWeight: 'bold', fontSize: '18px', color: '#1B3A6B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle style={{ color: '#EF4444' }} />
              Confirm Log Out
            </DialogTitle>
            <DialogContent>
              <DialogContentText style={{ fontSize: '14px', color: '#64748b' }}>
                Are you sure you want to end your BatchMinder advisory session?
              </DialogContentText>
            </DialogContent>
            <DialogActions style={{ padding: '8px 24px 16px' }}>
              <MuiButton
                onClick={() => setShowLogoutModal(false)}
                style={{ color: '#64748b', textTransform: 'none', fontWeight: '600', fontSize: '14px' }}
              >
                Cancel
              </MuiButton>
              <MuiButton
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                style={{
                  backgroundColor: '#EF4444',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                  padding: '6px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                }}
              >
                Log Out
              </MuiButton>
            </DialogActions>
          </Dialog>
        </div>
      </div>
    );
  }

  // Guest View (Login / Signup Forms)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-brandNavy selection:text-white relative overflow-hidden font-sans">
      {/* Background blobs for premium depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-100/40 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brandNavy to-brandAccent flex items-center justify-center shadow-md">
              <Layers className="h-5 w-5 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-display">
              BatchMinder
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 shadow-sm">
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
            <span className="hover:text-slate-600 cursor-pointer transition-colors text-sm">Privacy Policy</span>
            <span className="hover:text-slate-600 cursor-pointer transition-colors text-sm">Terms of Service</span>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition-colors">
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
