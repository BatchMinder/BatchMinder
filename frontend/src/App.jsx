import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import DeanSetup from './components/auth/DeanSetup';
import ResetPassword from './components/auth/ResetPassword';
import DeanDashboard from './components/dashboard/DeanDashboard';
import CurriculumGrid from './components/curriculum/CurriculumGrid';
import EquivalencyForm from './components/curriculum/EquivalencyForm';
import StudentTable from './components/students/StudentTable';
import DataIngestionHub from './pages/ingestion/DataIngestionHub';
import CurriculumBoard from './pages/curriculum/CurriculumBoard';
import MigrationManager from './pages/migration/MigrationManager';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import StudentRecords from './pages/admin/StudentRecords';
import MigrationRecords from './pages/admin/Migrationrecords';
import CurriculumSetup from './pages/admin/CurriculumSetup';
import Batches from './pages/admin/Batches';
import NotificationsPage from './components/dashboard/NotificationsPage';
import ProfileSettingsPage from './components/dashboard/ProfileSettingsPage';
import AuditLogsPage from './components/dashboard/AuditLogsPage';
import AdvisorDashboard from './components/dashboard/AdvisorDashboard';
import AdvisorStudents from './components/dashboard/AdvisorStudents';
import HODQueue from './pages/hod/HODQueue';
import RequestHistory from './pages/hod/RequestHistory';

import Footer from './components/Footer';

// 💻 YOUR TEAMMATE'S MODULE 4 BATCH ADVISOR PAGE IMPORT
import AdvisorQueue from './pages/advisor/AdvisorQueue';
import AdvisorMyBatch from './pages/advisor/AdvisorMyBatch';
import AdvisorMigrations from './pages/advisor/AdvisorMigrations';
import AdvisorRiskDashboard from './pages/advisor/AdvisorRiskDashboard';

import {
  Layers,
  CheckCircle,
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
import CircularProgress from '@mui/material/CircularProgress';
import LogoutModal from './components/shared/LogoutModal';

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
      const validPages = ['dashboard', 'students', 'upload', 'migrations', 'curriculum', 'batches', 'audit_logs', 'settings', 'notifications', 'attendance', 'special_permission'];
      if (validPages.includes(subPage)) {
        return subPage;
      }
    }
    return 'dashboard';
  });

  const [advisorActiveNav, setAdvisorActiveNav] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/dashboard/')) {
      const subPage = path.substring('/dashboard/'.length);
      const validPages = ['dashboard', 'myBatch', 'students', 'at_risk_monitoring', 'workflowQueue', 'attendance', 'settings', 'notifications', 'degree_plan', 'migrations'];
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
      const validPages = ['dashboard', 'history', 'settings', 'notifications', 'audit_logs'];
      if (validPages.includes(subPage)) {
        return subPage;
      }
    }
    return 'dashboard';
  });
  const [advisorBatches, setAdvisorBatches] = useState([]);
  const [selectedAdvisorBatch, setSelectedAdvisorBatch] = useState('all');


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
      setCurrentPath(path);
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
        const validPages = ['dashboard', 'students', 'upload', 'migrations', 'curriculum', 'batches', 'audit_logs', 'settings', 'notifications', 'attendance', 'special_permission'];
        if (validPages.includes(subPage)) setAdminActiveNav(subPage);
      }
      if (user?.role === 'advisor') {
        const validPages = ['dashboard', 'myBatch', 'students', 'at_risk_monitoring', 'workflowQueue', 'attendance', 'settings', 'notifications', 'degree_plan', 'migrations'];
        if (validPages.includes(subPage)) setAdvisorActiveNav(subPage);
      }
      if (user?.role === 'admin') {
        const validPages = ['dashboard', 'history', 'settings', 'notifications', 'audit_logs'];
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
    if (user.role === 'dean') {
      return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
          <DeanDashboard onLogout={() => setShowLogoutModal(true)} />

          <LogoutModal
            open={showLogoutModal}
            onClose={() => setShowLogoutModal(false)}
            onConfirm={() => { setShowLogoutModal(false); logout(); }}
            role={user.role}
          />
        </div>
      );
    }
    if (user.role === 'academic_admin') {
      const pages = {
        dashboard: <Dashboard setActiveNav={setAdminActiveNav} />,
        students: <StudentRecords setActiveNav={setAdminActiveNav} />,
        upload: <DataIngestionHub />,
        migrations: <MigrationRecords />,
        curriculum: <CurriculumSetup />,
        batches: <Batches setActiveNav={setAdminActiveNav} />,
        audit_logs: <AuditLogsPage setActiveNav={setAdminActiveNav} />,
        settings: <ProfileSettingsPage />,
        notifications: <NotificationsPage setActiveNav={setAdminActiveNav} />,
        special_permission: <HODQueue />,
      };
      return <AdminLayout activeNav={adminActiveNav} onNavigate={setAdminActiveNav}>{pages[adminActiveNav] || <Dashboard setActiveNav={setAdminActiveNav} />}</AdminLayout>;
    }

    if (user.role === 'advisor') {
      const pages = {
        dashboard: <AdvisorDashboard selectedBatch={selectedAdvisorBatch} setActiveNav={setAdvisorActiveNav} />,
        myBatch: <AdvisorMyBatch selectedBatch={selectedAdvisorBatch} />,
        students: <AdvisorStudents selectedBatch={selectedAdvisorBatch} />,
        workflowQueue: <AdvisorQueue />,
        settings: <ProfileSettingsPage />,
        notifications: <NotificationsPage setActiveNav={setAdvisorActiveNav} />,
        degree_plan: <CurriculumBoard selectedBatch={selectedAdvisorBatch} />,
        migrations: <AdvisorMigrations selectedBatch={selectedAdvisorBatch} />,
        at_risk_monitoring: <AdvisorRiskDashboard selectedBatch={selectedAdvisorBatch} />,
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

    // HOD  Dashboard Layout
    if (user.role === 'admin') {
      const pages = {
        dashboard: <HODQueue />,
        history: <RequestHistory />,
        settings: <ProfileSettingsPage />,
        notifications: <NotificationsPage setActiveNav={setHodActiveNav} />,
        audit_logs: <AuditLogsPage setActiveNav={setHodActiveNav} />,
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
      {
        currentPath === '/dean-setup' ? (
          <DeanSetup setCurrentPath={setCurrentPath} />
        ) : currentPath.startsWith('/reset-password') ? (
          <ResetPassword />
        ) : (
          <Login />
        )
      }
      <Footer />
    </div >
  );
}

export default App;