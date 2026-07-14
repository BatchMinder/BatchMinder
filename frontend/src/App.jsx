import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import SuperAdminSetup from './components/auth/SuperAdminSetup';
import SuperAdminDashboard from './components/dashboard/SuperAdminDashboard';
import CurriculumGrid from './components/curriculum/CurriculumGrid';
import EquivalencyForm from './components/curriculum/EquivalencyForm';
import FileDropzone from './components/ingestion/FileDropzone';
import StudentModal from './components/students/StudentModal';
import StudentTable from './components/students/StudentTable';
import SyncPanel from './components/ingestion/SyncPanel';
import PrerequisiteMapper from './components/curriculum/PrerequisiteMapper';
import ProgressPreview from './components/dashboard/ProgressPreview';
import RecordsDirectory from './pages/students/RecordsDirectory';
import DataIngestionHub from './pages/ingestion/DataIngestionHub';
import CurriculumBoard from './pages/curriculum/CurriculumBoard';
import MigrationManager from './pages/migration/MigrationManager';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import StudentRecords from './pages/admin/StudentRecords';
import CsvUpload from './pages/admin/CsvUpload';
import MigrationRecords from './pages/admin/MigrationRecords';
import CurriculumSetup from './pages/admin/CurriculumSetup';
import Batches from './pages/admin/Batches';
import NotificationsPage from './components/dashboard/NotificationsPage';
import AuditLogsPage from './components/dashboard/AuditLogsPage';
import ProfileSettingsPage from './components/dashboard/ProfileSettingsPage';
import AdvisorDashboard from './components/dashboard/AdvisorDashboard';
import AdvisorStudents from './components/dashboard/AdvisorStudents';
import HODQueue from './pages/hod/HODQueue';
import RequestHistory from './pages/hod/RequestHistory';
import TimetableGenerator from './pages/scheduling/TimetableGenerator';
import DatesheetGenerator from './pages/scheduling/DatesheetGenerator';
import ScheduleOverride from './pages/scheduling/ScheduleOverride';
import Footer from './components/Footer';

// 💻 YOUR TEAMMATE'S MODULE 4 BATCH ADVISOR PAGE IMPORT
import AdvisorQueue from './pages/advisor/AdvisorQueue';
import AdvisorTimetable from './pages/advisor/AdvisorTimetable';
import AdvisorReporting from './pages/advisor/AdvisorReporting';
import AdvisorMyBatch from './pages/advisor/AdvisorMyBatch';
import AttendanceDashboard from './pages/advisor/AttendanceDashboard';
import AdvisorRiskDashboard from './pages/advisor/AdvisorRiskDashboard';

import {
  Layers,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Shield,
  Clock,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  Zap
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
  const [activeTab, setActiveTab] = useState('overview');
  const [totalStudents, setTotalStudents] = useState(0);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const [backendStatus, setBackendStatus] = useState('checking');
  const [latency, setLatency] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 🚀 FORCED STATE: Starts automatically into the Timetable view, URL routed and persisted
  const [adminActiveNav, setAdminActiveNav] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/dashboard/')) {
      const subPage = path.substring('/dashboard/'.length);
      const validPages = ['dashboard', 'students', 'upload', 'migrations', 'curriculum', 'batches', 'timetable', 'datesheet', 'override', 'audit_logs', 'settings', 'timetable_generator', 'datesheet_generator', 'schedule_override', 'notifications', 'attendance', 'reports', 'special_permission'];
      if (validPages.includes(subPage)) {
        return subPage;
      }
    }
    return 'dashboard';
  });
  const [overrideInitialTab, setOverrideInitialTab] = useState(() => {
    return localStorage.getItem('batchminder_admin_override_initial_tab') || 'timetable';
  });

  const [advisorActiveNav, setAdvisorActiveNav] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/dashboard/')) {
      const subPage = path.substring('/dashboard/'.length);
      const validPages = ['dashboard', 'myBatch', 'students', 'at_risk_monitoring', 'workflowQueue', 'timetable', 'attendance', 'reporting', 'settings', 'notifications'];
      if (validPages.includes(subPage)) {
        return subPage;
      }
    }
    return 'dashboard';
  });
  const [hodActiveNav, setHodActiveNav] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/dashboard/')) {
      const subPage = path.substring('/dashboard/'.length);
      const validPages = ['dashboard', 'history', 'reporting', 'settings', 'notifications'];
      if (validPages.includes(subPage)) {
        return subPage;
      }
    }
    return 'dashboard';
  });
  const [advisorBatches, setAdvisorBatches] = useState([]);
  const [selectedAdvisorBatch, setSelectedAdvisorBatch] = useState('all');

  useEffect(() => {
    localStorage.setItem('batchminder_admin_override_initial_tab', overrideInitialTab);
  }, [overrideInitialTab]);

  // On login, always reset to dashboard
  useEffect(() => {
    if (user && sessionStorage.getItem('justLoggedIn') === 'true') {
      sessionStorage.removeItem('justLoggedIn');
      setAdminActiveNav('dashboard');
      setAdvisorActiveNav('dashboard');
      setHodActiveNav('dashboard');
      window.history.replaceState(null, '', '/dashboard');
    }
  }, [user]);

  // Sync Academic Admin state changes to URL path
  useEffect(() => {
    if (user && user.role === 'academic_admin') {
      const currentPath = window.location.pathname;
      const targetPath = adminActiveNav === 'dashboard' ? '/dashboard' : `/dashboard/${adminActiveNav}`;
      if (currentPath !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, [adminActiveNav, user]);

  // Sync Advisor state changes to URL path
  useEffect(() => {
    if (user && user.role === 'advisor') {
      const currentPath = window.location.pathname;
      const targetPath = advisorActiveNav === 'dashboard' ? '/dashboard' : `/dashboard/${advisorActiveNav}`;
      if (currentPath !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, [advisorActiveNav, user]);

  // Sync HOD state changes to URL path
  useEffect(() => {
    if (user && user.role === 'admin') {
      const currentPath = window.location.pathname;
      const targetPath = hodActiveNav === 'dashboard' ? '/dashboard' : `/dashboard/${hodActiveNav}`;
      if (currentPath !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, [hodActiveNav, user]);

  // Handle browser back/forward history navigation for all roles
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      if (!path.startsWith('/dashboard/')) {
        if (path === '/dashboard' || path === '/dashboard/') {
          if (user?.role === 'academic_admin') setAdminActiveNav('dashboard');
          if (user?.role === 'advisor') setAdvisorActiveNav('dashboard');
          if (user?.role === 'admin') setHodActiveNav('dashboard');
        }
        return;
      }
      
      const subPage = path.substring('/dashboard/'.length);
      if (user?.role === 'academic_admin') {
        const validPages = ['dashboard', 'students', 'upload', 'migrations', 'curriculum', 'batches', 'timetable', 'datesheet', 'override', 'audit_logs', 'settings', 'timetable_generator', 'datesheet_generator', 'schedule_override', 'notifications', 'attendance', 'reports', 'special_permission'];
        if (validPages.includes(subPage)) setAdminActiveNav(subPage);
      }
      if (user?.role === 'advisor') {
        const validPages = ['dashboard', 'myBatch', 'students', 'at_risk_monitoring', 'workflowQueue', 'timetable', 'attendance', 'reporting', 'settings', 'notifications'];
        if (validPages.includes(subPage)) setAdvisorActiveNav(subPage);
      }
      if (user?.role === 'admin') {
        const validPages = ['dashboard', 'history', 'reporting', 'settings', 'notifications'];
        if (validPages.includes(subPage)) setHodActiveNav(subPage);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'advisor') {
      const fetchBatches = async () => {
        try {
          const res = await fetch('/api/advisor/dashboard-summary');
          const text = await res.text();
          const data = text ? JSON.parse(text) : {};
          if (res.ok && data.status === 'success') {
            setAdvisorBatches(data.data.batches || []);
          }
        } catch (err) {
          console.error('Failed to fetch advisor batches:', err);
        }
      };
      fetchBatches();
    }
  }, [user]);

  const [students, setStudents] = useState([
    { _id: 's1', studentID: 'BSCS-23S-001', studentName: 'Alice Johnson', email: 'alice@example.com', semester: 3, cgpa: 3.40, batch: 'BSCS-2023' },
    { _id: 's2', studentID: 'BSCS-23S-002', studentName: 'Bob Smith', email: 'bob@example.com', semester: 5, cgpa: 1.90, batch: 'BSCS-2023' },
  ]);

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
    setLogsLoading(true);
    setLogsError('');
    try {
      const response = await fetch('/api/auth/audit-logs');
      const text = await response.text();
      const resData = text ? JSON.parse(text) : {};
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

  const fetchTotalStudents = async () => {
    try {
      const response = await fetch('/api/students?limit=1');
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (response.ok) {
        setTotalStudents(data.total || data.results || 0);
      }
    } catch (err) {
      console.error('Failed to fetch total students:', err);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAuditLogs();
      fetchTotalStudents();
    }
  }, [user]);

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

  if (user) {
    if (user.role === 'super_admin') {
      return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
          <SuperAdminDashboard onLogout={() => setShowLogoutModal(true)} />

          <Dialog open={showLogoutModal} onClose={() => setShowLogoutModal(false)} sx={{ '& .MuiDialog-paper': { borderRadius: '24px', padding: '16px', maxWidth: '380px', width: '100%' } }}>
            <DialogTitle style={{ fontWeight: 'bold', fontSize: '18px', color: '#1B3A6B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle style={{ color: '#EF4444' }} /> Confirm Log Out
            </DialogTitle>
            <DialogContent>
              <DialogContentText style={{ fontSize: '14px', color: '#64748b' }}>
                Are you sure you want to end your BatchMinder Super Admin session?
              </DialogContentText>
            </DialogContent>
            <DialogActions style={{ padding: '8px 24px 16px' }}>
              <MuiButton onClick={() => setShowLogoutModal(false)} style={{ color: '#64748b', textTransform: 'none', fontWeight: '600', fontSize: '14px' }}>Cancel</MuiButton>
              <MuiButton onClick={() => { setShowLogoutModal(false); logout(); }} style={{ backgroundColor: '#EF4444', color: '#ffffff', textTransform: 'none', fontWeight: '600', fontSize: '14px', padding: '6px 20px', borderRadius: '12px' }}>Log Out</MuiButton>
            </DialogActions>
          </Dialog>
        </div>
      );
    }

    // ==========================================================
    // 🏛️ MODULE 5 SEPARATE INDEPENDENT WORKSPACE VIEWS
    // ==========================================================
    if (user.role === 'academic_admin') {

      // 1. TIMETABLE GENERATOR SCREEN PANEL
      const EmptySchedulingDashboard = () => {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 16, backgroundColor: '#FFF', borderRadius: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Module 5: Intelligent Scheduling Engine Preview</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>Connecting safely with 0 rows to check system layout state interfaces.</p>
            </div>

            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <CheckCircle2 size={20} color="#16A34A" />
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#166534' }}>Schedule Integrity Verified</h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#15803D' }}>Zero overlapping matrices, faculty clashes, or space capacity violations detected.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(day => (
                <div key={day} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 10, minHeight: 140, backgroundColor: '#FAFAFA' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#1B3A6B', paddingBottom: 8, textTransform: 'uppercase', textAlign: 'center' }}>{day}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', paddingTop: 30 }}>No active slots</div>
                </div>
              ))}
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', fontSize: 12 }}>
              <div style={{ padding: 8, backgroundColor: '#F8FAFC', fontWeight: 700, borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>Modification Security History Records Logs</div>
              <div style={{ padding: 16, color: '#94A3B8', textAlign: 'center' }}>No override mutations logged.</div>
            </div>
          </div>
        );
      };

      // 2. DATESHEET GENERATOR SCREEN PANEL
      const EmptyDatesheetDashboard = () => {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 16, backgroundColor: '#FFF', borderRadius: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Module 5: Intelligent Datesheet Examination Matrix</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>Automated examination slot planner block configurations.</p>
            </div>

            <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <BookOpen size={20} color="#2563EB" />
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E40AF' }}>Examination Matrix Setup Ready</h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#1D4ED8' }}>Ready to generate balanced non-clashing student mid/final examination sequences.</p>
              </div>
            </div>

            <div style={{ border: '1px dashed #CBD5E1', borderRadius: 12, padding: 40, textAlign: 'center', backgroundColor: '#F8FAFC' }}>
              <Calendar size={32} color="#94A3B8" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#475569' }}>No datesheet configurations initialized yet</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>Select curriculum records data batches to assemble structural exam maps.</p>
            </div>
          </div>
        );
      };

      // 3. ADMINISTRATIVE SCHEDULE OVERRIDE SCREEN PANEL
      const EmptyOverrideDashboard = () => {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 16, backgroundColor: '#FFF', borderRadius: 12 }}>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Module 5: Administrative Security Schedule Override</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>Manual resource manipulation controls and allocation logs.</p>
            </div>

            <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <Lock size={20} color="#D97706" />
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#92400E' }}>Elevated Administrative Mode</h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#B45309' }}>Authorized overrides will bypass standard conflict checks and record directly to system audit logs.</p>
              </div>
            </div>

            <div style={{ border: '1px solid #F3F4F6', borderRadius: 8, padding: 24, backgroundColor: '#FAFAFA', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Active Manual Allocations</h4>
              <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic', padding: '10px 0' }}>Zero manual mutations or session force operations currently deployed.</div>
            </div>
          </div>
        );
      };

      const pages = {
        dashboard: <Dashboard setActiveNav={setAdminActiveNav} />,
        students: <StudentRecords setActiveNav={setAdminActiveNav} />,
        upload: <DataIngestionHub />,
        migrations: <MigrationRecords />,
        curriculum: <CurriculumSetup />,
        batches: <Batches />,
        timetable: <TimetableGenerator setActiveNav={(nav) => { setAdminActiveNav(nav); if (nav === 'schedule_override' || nav === 'override') setOverrideInitialTab('timetable'); }} />,
        datesheet: <DatesheetGenerator setActiveNav={(nav) => { setAdminActiveNav(nav); if (nav === 'schedule_override' || nav === 'override') setOverrideInitialTab('datesheet'); }} />,
        override: <ScheduleOverride initialTab={overrideInitialTab} />,
        audit_logs: <AuditLogsPage setActiveNav={setAdminActiveNav} />,
        settings: <ProfileSettingsPage />,

        // 🗓️ Switched paths to load their individual separate view screens!
        timetable_generator: <TimetableGenerator setActiveNav={(nav) => { setAdminActiveNav(nav); if (nav === 'schedule_override') setOverrideInitialTab('timetable'); }} />,
        datesheet_generator: <DatesheetGenerator setActiveNav={(nav) => { setAdminActiveNav(nav); if (nav === 'schedule_override') setOverrideInitialTab('datesheet'); }} />,
        schedule_override: <ScheduleOverride initialTab={overrideInitialTab} />,
        notifications: <NotificationsPage setActiveNav={setAdminActiveNav} />,
        attendance: <AttendanceDashboard user={user} />,
        reports: <AdvisorReporting />,
        special_permission: <HODQueue />,
      };
      return <AdminLayout activeNav={adminActiveNav} onNavigate={setAdminActiveNav}>{pages[adminActiveNav] || <Dashboard setActiveNav={setAdminActiveNav} />}</AdminLayout>;
    }

    if (user.role === 'advisor') {
      const pages = {
        dashboard: <AdvisorDashboard selectedBatch={selectedAdvisorBatch} setActiveNav={setAdvisorActiveNav} />,
        myBatch: <AdvisorMyBatch selectedBatch={selectedAdvisorBatch} />,
        students: <AdvisorStudents selectedBatch={selectedAdvisorBatch} />,
        at_risk_monitoring: <AdvisorRiskDashboard />,
        workflowQueue: <AdvisorQueue />,
        timetable: <AdvisorTimetable />,
        attendance: <AttendanceDashboard user={user} />,
        reporting: <AdvisorReporting />,
        settings: <ProfileSettingsPage />,
        notifications: <NotificationsPage setActiveNav={setAdvisorActiveNav} />,
      };
      return (
        <AdminLayout
          activeNav={advisorActiveNav}
          onNavigate={setAdvisorActiveNav}
          batches={advisorBatches}
          selectedBatch={selectedAdvisorBatch}
          onBatchChange={setSelectedAdvisorBatch}
        >
          {pages[advisorActiveNav] || <AdvisorDashboard selectedBatch={selectedAdvisorBatch} setActiveNav={setAdvisorActiveNav} />}
        </AdminLayout>
      );
    }

    // HOD  Dashboard Layout
    if (user.role === 'admin') {
      const pages = {
        dashboard: <HODQueue />,
        history: <RequestHistory />,
        reporting: <AdvisorReporting />,
        settings: <ProfileSettingsPage />,
        notifications: <NotificationsPage setActiveNav={setHodActiveNav} />,
      };
      return (
        <AdminLayout
          activeNav={hodActiveNav}
          onNavigate={setHodActiveNav}
        >
          {pages[hodActiveNav] || <HODQueue />}
        </AdminLayout>
      );
    }

    const roleColors = {
      admin: 'text-brandNavy bg-brandNavy/5 border-brandNavy/20',
      advisor: 'text-brandAccent bg-brandAccent/5 border-brandAccent/20',
    };

    const roleLabels = {
      admin: 'HOD / Admin',
      advisor: 'Batch Advisor',
    };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-brandNavy selection:text-white relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-100/40 blur-[120px] pointer-events-none" />

        <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 pr-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brandNavy to-brandAccent flex items-center justify-center shadow-md">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 font-display">
                BatchMinder Portal
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-slate-200">
                <div className="text-right">
                  <h4 className="text-sm font-semibold text-slate-800">{user.name}</h4>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full border uppercase ${roleColors[user.role]}`}>
                  {roleLabels[user.role]}
                </span>
              </div>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-2 text-slate-500 hover:text-alertCritical text-sm font-medium transition-colors focus:outline-none"
                title="Log Out"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full z-10 animate-fade-in">
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-6 space-y-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden">
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-2 font-display">Welcome Back, {user.name.split(' ')[0]}!</h2>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4">
                    Your role provides full access to the Advisory Portal. Use the navigation panel below to view timetables, request approvals, and configure batch actions.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock className="h-5 w-5" /> Logged in session active
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm">
                    <span className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Students Managed</span>
                    <h3 className="text-3xl font-extrabold text-brandNavy mt-1 font-display">{totalStudents}</h3>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm">
                    <span className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Pending Approvals</span>
                    <h3 className="text-3xl font-extrabold text-brandAccent mt-1 font-display">7</h3>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-200">
                    <span className="text-sm text-slate-700 font-medium">Express API Gateway</span>
                    <span className="text-sm font-semibold text-alertGood bg-alertGood/5 px-2.5 py-1 rounded-full border border-alertGood/20 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" /> Online
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans bg-slate-50 overflow-x-hidden">
      {currentPath === '/super-admin-setup' ? (
        <SuperAdminSetup setCurrentPath={setCurrentPath} />
      ) : (
        <Login />
      )}
      <Footer />
    </div>
  );
}

export default App;