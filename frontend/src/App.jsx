import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import CurriculumGrid from './components/curriculum/CurriculumGrid';
import EquivalencyForm from './components/curriculum/EquivalencyForm';
import FileDropzone from './components/ingestion/FileDropzone';
import StudentModal from './components/students/StudentModal';
import StudentTable from './components/students/StudentTable';
import SyncPanel from './components/ingestion/SyncPanel';
import PrerequisiteMapper from './components/curriculum/PrerequisiteMapper';
import ProgressPreview from './components/dashboard/ProgressPreview';
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

  // Dashboard states
  const [backendStatus, setBackendStatus] = useState('checking');
  const [latency, setLatency] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');

  // Logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Unified data key states (lowercased 'cgpa' and default 'batch' appended)
  const [students, setStudents] = useState([
    { _id: 's1', studentID: 'BSCS-23S-001', studentName: 'Alice Johnson', email: 'alice@example.com', semester: 3, cgpa: 3.40, batch: 'BSCS-2023' },
    { _id: 's2', studentID: 'BSCS-23S-002', studentName: 'Bob Smith', email: 'bob@example.com', semester: 5, cgpa: 1.90, batch: 'BSCS-2023' },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingStudent(null);
  };

  const handleSaveStudent = (updated) => {
    setStudents((prev) => {
      const targetId = editingStudent?._id;
      const idx = targetId ? prev.findIndex((s) => s._id === targetId) : -1;

      const formattedRecord = {
        ...updated,
        semester: Number(updated.semester),
        cgpa: updated.cgpa !== '' ? Number(updated.cgpa) : null
      };

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...formattedRecord };
        return copy;
      }
      return [...prev, { ...formattedRecord, _id: `new-${Date.now()}` }];
    });
    handleCloseModal();
  };

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

        <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full grid lg:grid-cols-12 gap-8 z-10">
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="absolute right-4 top-4 text-slate-100 pointer-events-none">
                <Shield className="h-20 w-20" />
              </div>
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
                <h3 className="text-3xl font-extrabold text-brandNavy mt-1 font-display">142</h3>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm">
                <span className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Pending Approvals</span>
                <h3 className="text-3xl font-extrabold text-brandAccent mt-1 font-display">7</h3>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">BatchMinder Modules</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-alertGood/5 border border-alertGood/25 text-alertGood">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5" />
                    <span className="text-sm font-semibold">Module 1: Auth & RBAC</span>
                  </div>
                  <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-white border border-alertGood/30">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-400">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5" />
                    <span className="text-sm">Module 2: CGPA & Risk Prediction</span>
                  </div>
                  <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200">Soon</span>
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

          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Connection Health</h3>
                <button
                  onClick={checkHealth}
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-brandAccent transition-colors border border-slate-200 focus:outline-none"
                >
                  <RefreshCw className={`h-4 w-4 ${backendStatus === 'checking' ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 border border-slate-200">
                <span className="text-sm text-slate-700 font-medium">Express API Gateway</span>
                {backendStatus === 'online' ? (
                  <span className="text-sm font-semibold text-alertGood bg-alertGood/5 px-2.5 py-1 rounded-full border border-alertGood/20 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" /> Online {latency ? `(${latency}ms)` : ''}
                  </span>
                ) : backendStatus === 'checking' ? (
                  <span className="text-sm font-semibold text-alertWarning bg-alertWarning/5 px-2.5 py-1 rounded-full border border-alertWarning/20 flex items-center gap-1.5">
                    <CircularProgress size={10} color="inherit" /> Checking
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-alertCritical bg-alertCritical/5 px-2.5 py-1 rounded-full border border-alertCritical/20 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Offline
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Database Audit Logs</h3>
                <button
                  onClick={fetchAuditLogs}
                  className="text-sm text-brandAccent hover:text-brandAccent/90 font-bold flex items-center gap-1 transition-colors focus:outline-none"
                >
                  <RefreshCw className={`h-3 w-3 ${logsLoading ? 'animate-spin' : ''}`} /> Reload
                </button>
              </div>

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
                  <div className="py-8 text-center text-sm text-slate-400">No database logs recorded yet.</div>
                )}
                {!logsLoading && !logsError && auditLogs.map((log) => (
                  <div key={log._id} className="p-3 rounded-lg bg-slate-50/50 border border-slate-200/80 hover:border-slate-300/80 transition-colors text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-brandAccent bg-brandAccent/5 px-2 py-0.5 rounded uppercase text-sm border border-brandAccent/10">
                        {log.action}
                      </span>
                      <span className="text-sm text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-600 leading-normal text-sm">{log.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        <Dialog open={showLogoutModal} onClose={() => setShowLogoutModal(false)} PaperProps={{ style: { borderRadius: '24px', padding: '16px', maxWidth: '380px' } }}>
          <DialogTitle style={{ fontWeight: 'bold', fontSize: '18px', color: '#1B3A6B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle style={{ color: '#EF4444' }} /> Confirm Log Out
          </DialogTitle>
          <DialogContent>
            <DialogContentText style={{ fontSize: '14px', color: '#64748b' }}>
              Are you sure you want to end your BatchMinder advisory session?
            </DialogContentText>
          </DialogContent>
          <DialogActions style={{ padding: '8px 24px 16px' }}>
            <MuiButton onClick={() => setShowLogoutModal(false)} style={{ color: '#64748b', textTransform: 'none', fontWeight: '600', fontSize: '14px' }}>Cancel</MuiButton>
            <MuiButton onClick={() => { setShowLogoutModal(false); logout(); }} style={{ backgroundColor: '#EF4444', color: '#ffffff', textTransform: 'none', fontWeight: '600', fontSize: '14px', padding: '6px 20px', borderRadius: '12px' }}>Log Out</MuiButton>
          </DialogActions>
        </Dialog>

        <footer className="border-t border-slate-200/80 bg-white py-6 mt-12">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <div>&copy; {new Date().getFullYear()} BatchMinder. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <span className="hover:text-slate-600 cursor-pointer transition-colors text-sm">Privacy Policy</span>
              <span className="hover:text-slate-600 cursor-pointer transition-colors text-sm">Terms of Service</span>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition-colors"><Github className="h-5 w-5" /></a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Aligned & Highly Responsive Guest View Sandbox Grid Layout
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-brandNavy selection:text-white relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-100/40 blur-[120px] pointer-events-none" />

      <header className="border-b border-slate-200/80 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brandNavy to-brandAccent flex items-center justify-center shadow-md">
              <Layers className="h-5 w-5 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-display">BatchMinder</span>
          </div>
          <div>
            <span className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 shadow-sm">v1.0.0</span>
          </div>
        </div>
      </header>

      {/* Responsive Grid System: Multi-column handling based on breakpoint widths */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full z-10 items-start">

        {/* Full row table layout */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 xl:col-span-3">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">👥 Student Record Directory</h2>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { setEditingStudent(null); setModalOpen(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm transition-colors shadow-sm"
            >
              + Register New Student Profile
            </button>
          </div>
          <StudentTable
            students={students}
            canEdit={true}
            onAdd={() => { setEditingStudent(null); setModalOpen(true); }}
            onEdit={(student) => { setEditingStudent(student); setModalOpen(true); }}
          />
          <StudentModal
            open={modalOpen}
            onClose={handleCloseModal}
            studentData={editingStudent}
            onSave={handleSaveStudent}
            canEdit={true}
          />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">📥 Bulk Data Ingestion</h2>
          <FileDropzone
            onFileUpload={async (file) => console.log('Spreadsheet template parsed for:', file.name)}
            templateUrl="/templates/student-records-template.csv"
          />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">📚 Curriculum Layout Overview</h2>
          <CurriculumGrid curriculumData={[
            {
              semester: 1,
              courses: [
                { courseCode: 'CS-101', courseTitle: 'Intro to Programming', creditHours: 3, courseType: 'Core' },
                { courseCode: 'MT-101', courseTitle: 'Calculus I', creditHours: 3, courseType: 'Core' },
              ]
            },
            {
              semester: 2,
              courses: [
                { courseCode: 'CS-201', courseTitle: 'Data Structures', creditHours: 3, courseType: 'Core' },
                { courseCode: 'CS-210', courseTitle: 'Advanced JavaScript', creditHours: 4, courseType: 'Elective' },
              ]
            },
          ]} />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">🔄 Transfer Decision Matrix</h2>
          <EquivalencyForm
            onSubmitEquivalency={(data) => console.log('Equivalency mapped:', data)}
            canEdit={true}
          />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">📡 LMS Sync Panel</h2>
          <SyncPanel
            sources={[
              { id: 'lms1', name: 'Moodle LMS Gateway', type: 'LMS', status: 'connected', lastSyncedAt: new Date().toISOString() },
              { id: 'erp1', name: 'Campus Management ERP', type: 'ERP', status: 'idle' },
            ]}
            onSync={async (sourceId) => console.log('Syncing channel:', sourceId)}
            canManageSync={true}
          />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">⛓️ Prerequisite Chain Mapper</h2>
          <PrerequisiteMapper
            courses={[
              { courseCode: 'CS-301', courseTitle: 'Algorithms', prerequisites: ['CS-101', 'CS-201'] },
              { courseCode: 'CS-101', courseTitle: 'Intro to Programming', prerequisites: [] },
            ]}
            completedCourseCodes={['CS-101']}
          />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">📊 Degree Progression</h2>
          <ProgressPreview
            progress={{
              totalCreditsRequired: 130,
              creditsCompleted: 90,
              creditsTransferred: 12,
              creditsLost: 3,
              recalculatedAt: new Date().toISOString(),
            }}
          />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div>&copy; {new Date().getFullYear()} BatchMinder. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-600 cursor-pointer transition-colors text-sm">Privacy Policy</span>
            <span className="hover:text-slate-600 cursor-pointer transition-colors text-sm">Terms of Service</span>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition-colors"><Github className="h-5 w-5" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;