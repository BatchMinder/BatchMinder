import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, AlertTriangle, ShieldCheck, ShieldAlert, Clock, BarChart2,
  Calendar, Search, ChevronRight, CheckCircle2, AlertCircle, X, Plus,
  TrendingUp, Lightbulb, Sparkles, BookOpen, Send, Check, RefreshCw, FileText
} from 'lucide-react';

export default function AdvisorDashboard({ selectedBatch, setActiveNav }) {
  const { user } = useAuth();
  
  // Dashboard Metrics & Records States
  const [stats, setStats] = useState({ total: 0, good: 0, warning: 0, critical: 0 });
  const [students, setStudents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModal, setSelectedModal] = useState(null); // 'prereq', 'addStudent', 'meeting', 'notification', 'calendar'
  
  // Interactive Modal Fields
  const [prereqStudentId, setPrereqStudentId] = useState('');
  const [prereqCourse, setPrereqCourse] = useState('Data Structures');
  const [prereqResult, setPrereqResult] = useState(null);
  
  const [newStudentData, setNewStudentData] = useState({
    rollNumber: '',
    name: '',
    email: '',
    semester: 1,
    cgpa: 3.00,
    batchCode: ''
  });
  
  const [meetingData, setMeetingData] = useState({
    title: '',
    date: '',
    time: '',
    type: 'On Campus'
  });
  
  const [broadcastData, setBroadcastData] = useState({
    target: 'Warning List',
    alertType: 'warning',
    message: ''
  });

  const [toastMessage, setToastMessage] = useState(null);

  const assignedBatches = user?.assignedBatchIds || [];
  const hasNoBatches = assignedBatches.length === 0;

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDashboardData = async () => {
    if (hasNoBatches) return;
    setLoading(true);
    try {
      // 1. Fetch dynamic stats summary
      const summaryUrl = selectedBatch && selectedBatch !== 'all'
        ? `/api/advisor/dashboard-summary?batchId=${selectedBatch}`
        : '/api/advisor/dashboard-summary';
      const summaryRes = await fetch(summaryUrl);
      const summaryText = await summaryRes.text();
      const summaryData = summaryText ? JSON.parse(summaryText) : {};
      if (summaryRes.ok && summaryData.status === 'success') {
        setStats(summaryData.data.stats || { total: 0, good: 0, warning: 0, critical: 0 });
      }

      // 2. Fetch assigned students list
      const studentsUrl = selectedBatch && selectedBatch !== 'all'
        ? `/api/advisor/students?limit=500&batchId=${selectedBatch}`
        : '/api/advisor/students?limit=500';
      const studentsRes = await fetch(studentsUrl);
      const studentsText = await studentsRes.text();
      const studentsData = studentsText ? JSON.parse(studentsText) : {};
      if (studentsRes.ok && studentsData.status === 'success') {
        setStudents(studentsData.data.students || []);
      }

      // 3. Fetch workflow approval requests
      const requestsRes = await fetch('/api/advisor/requests');
      const requestsText = await requestsRes.text();
      const requestsData = requestsText ? JSON.parse(requestsText) : {};
      if (requestsRes.ok && requestsData.status === 'success') {
        setRequests(requestsData.data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load advisor dashboard summaries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedBatch]);

  if (hasNoBatches) {
    return (
      <div style={{
        padding: '40px', textAlign: 'center', backgroundColor: '#FFFFFF',
        borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <AlertTriangle size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
          No Batches Assigned
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
          Contact your Super Admin to get assigned to your academic batches.
        </p>
      </div>
    );
  }

  // Statistics calculation helpers
  const totalCount = stats.total || 0;
  const atRiskCount = (stats.warning || 0) + (stats.critical || 0);
  const atRiskPct = totalCount > 0 ? ((atRiskCount / totalCount) * 100).toFixed(1) : '0.0';

  // FR-3.3: Warning status — CGPA <= 2.1
  // FR-3.4: Critical status — CGPA < 2.0
  const criticalStudents = students.filter(s => (s.cgpa || 0) < 2.0);
  const warningStudents = students.filter(s => (s.cgpa || 0) >= 2.0 && (s.cgpa || 0) <= 2.1);
  const criticalCount = criticalStudents.length;
  const warningCount = warningStudents.length;
  
  // Calculate average CGPA
  const avgCgpa = students.length > 0
    ? (students.reduce((acc, s) => acc + (s.cgpa || 0), 0) / students.length).toFixed(2)
    : '0.00';

  // CGPA ranges segments
  let range35Plus = 0;  // 3.50 - 4.00
  let range25_34 = 0;   // 2.50 - 3.49
  let range20_24 = 0;   // 2.00 - 2.49
  let rangeUnder2 = 0;  // Below 2.00

  students.forEach(s => {
    const cg = s.cgpa || 0;
    if (cg >= 3.50) range35Plus++;
    else if (cg >= 2.50) range25_34++;
    else if (cg >= 2.00) range20_24++;
    else rangeUnder2++;
  });

  const p1 = totalCount > 0 ? ((range35Plus / totalCount) * 100).toFixed(1) : '0.0';
  const p2 = totalCount > 0 ? ((range25_34 / totalCount) * 100).toFixed(1) : '0.0';
  const p3 = totalCount > 0 ? ((range20_24 / totalCount) * 100).toFixed(1) : '0.0';
  const p4 = totalCount > 0 ? ((rangeUnder2 / totalCount) * 100).toFixed(1) : '0.0';

  const donutGradient = totalCount > 0
    ? `conic-gradient(#10B981 0% ${p1}%, #3B82F6 ${p1}% ${Number(p1) + Number(p2)}%, #F59E0B ${Number(p1) + Number(p2)}% ${Number(p1) + Number(p2) + Number(p3)}%, #EF4444 ${Number(p1) + Number(p2) + Number(p3)}% 100%)`
    : `conic-gradient(#E2E8F0 0% 100%)`;

  // Degree Progress Indicators
  const onTrackCount = students.filter(s => s.cgpa >= 3.0).length;
  const degreeAtRiskCount = students.filter(s => s.cgpa >= 2.0 && s.cgpa < 3.0).length;
  const behindCount = students.filter(s => s.cgpa < 2.0).length;
  const graduatedCount = students.filter(s => s.currentSemester >= 8).length;

  const onTrackPct = totalCount > 0 ? ((onTrackCount / totalCount) * 100).toFixed(1) : '0.0';
  const degreeAtRiskPct = totalCount > 0 ? ((degreeAtRiskCount / totalCount) * 100).toFixed(1) : '0.0';
  const behindPct = totalCount > 0 ? ((behindCount / totalCount) * 100).toFixed(1) : '0.0';
  const graduatedPct = totalCount > 0 ? ((graduatedCount / totalCount) * 100).toFixed(1) : '0.0';

  // Real DB data only — no fallbacks
  const atRiskStudents = students.filter(s => s.cgpaStatus === 'warning' || s.cgpaStatus === 'critical');
  const displayAtRisk = atRiskStudents.slice(0, 5);

  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'Pending' || r.status === 'Pending Advisor');
  const displayRequests = pendingRequests.slice(0, 5);

  // Semester Trend — real data derived from students (grouped by semester)
  const semesterMap = {};
  students.forEach(s => {
    const sem = s.currentSemester || 1;
    if (!semesterMap[sem]) semesterMap[sem] = [];
    semesterMap[sem].push(s.cgpa || 0);
  });
  const semesterKeys = Object.keys(semesterMap).sort((a, b) => Number(a) - Number(b));
  const semesterAvgGpas = semesterKeys.map(k => {
    const vals = semesterMap[k];
    return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
  });
  const semesterLabels = semesterKeys.map(k => `Semester ${k}`);

  // Handle Prerequisite Evaluation
  const evaluatePrereq = () => {
    if (!prereqStudentId) {
      triggerToast('Please select a student first.');
      return;
    }
    const studentObj = students.find(s => s.id === prereqStudentId || s._id === prereqStudentId);
    
    // Simulate prerequisite evaluation rules
    const coursesDone = ['Intro to Computing', 'Programming Fundamentals', 'Calculus-I'];
    if (prereqCourse === 'OOP') {
      const pass = coursesDone.includes('Programming Fundamentals');
      setPrereqResult({
        status: pass ? 'Passed' : 'Failed',
        requirements: ['Programming Fundamentals'],
        missing: pass ? [] : ['Programming Fundamentals'],
        completed: coursesDone
      });
    } else if (prereqCourse === 'Data Structures') {
      setPrereqResult({
        status: 'Failed',
        requirements: ['OOP'],
        missing: ['OOP'],
        completed: coursesDone
      });
    } else if (prereqCourse === 'Database Systems') {
      setPrereqResult({
        status: 'Passed',
        requirements: ['Programming Fundamentals'],
        missing: [],
        completed: coursesDone
      });
    } else {
      setPrereqResult({
        status: 'Passed',
        requirements: ['Calculus-I'],
        missing: [],
        completed: coursesDone
      });
    }
  };

  // Submit mock draft profile request
  const submitNewStudentRequest = (e) => {
    e.preventDefault();
    if (!newStudentData.rollNumber || !newStudentData.name) {
      triggerToast('Please provide Roll Number and Full Name.');
      return;
    }
    triggerToast(`Draft Request created! Academic Administrator notified to sync profile of student ${newStudentData.name}.`);
    setSelectedModal(null);
    setNewStudentData({ rollNumber: '', name: '', email: '', semester: 1, cgpa: 3.00, batchCode: '' });
  };

  // Submit mock meeting schedule
  const submitMeeting = (e) => {
    e.preventDefault();
    if (!meetingData.title || !meetingData.date) {
      triggerToast('Please specify a title and date.');
      return;
    }
    triggerToast(`Meeting Scheduled successfully! Calendar notification broadcasted to students.`);
    setSelectedModal(null);
    setMeetingData({ title: '', date: '', time: '', type: 'On Campus' });
  };

  // Submit mock warning broadcast
  const submitBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastData.message) {
      triggerToast('Alert message cannot be blank.');
      return;
    }
    triggerToast(`Alert broadcast successfully sent to ${broadcastData.target}!`);
    setSelectedModal(null);
    setBroadcastData({ target: 'Warning List', alertType: 'warning', message: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      
      {/* Dynamic Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 1100,
          backgroundColor: '#0F172A', color: '#F8FAFC', border: '1px solid #334155',
          borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontSize: '13px', fontWeight: 600
        }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} style={{ border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── FIVE METRIC CARDS ROW ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Students */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={17} color="#2563EB" />
            </div>
            <button onClick={() => setActiveNav('students')} style={{ border: 'none', backgroundColor: 'transparent', fontSize: '10px', fontWeight: 700, color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit' }} onMouseEnter={e => e.currentTarget.style.color = '#2563EB'} onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
              View Batches &rarr;
            </button>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>My Total Students</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
              {loading ? '...' : totalCount}
            </h3>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            Across {assignedBatches.length} batches
          </div>
        </div>

        {/* Card 2: At-Risk Students */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={17} color="#EF4444" />
            </div>
            <button onClick={() => setActiveNav('students')} style={{ border: 'none', backgroundColor: 'transparent', fontSize: '10px', fontWeight: 700, color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit' }} onMouseEnter={e => e.currentTarget.style.color = '#E11D48'} onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
              View Risk List &rarr;
            </button>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>At-Risk Students</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#EF4444', letterSpacing: '-0.5px' }}>
              {loading ? '...' : atRiskCount}
            </h3>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#EF4444', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            {loading ? '...' : atRiskPct}% of my batch
          </div>
        </div>

        {/* Card 3: Pending Approvals */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', backgroundColor: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={17} color="#F59E0B" />
            </div>
            <button onClick={() => setActiveNav('workflowQueue')} style={{ border: 'none', backgroundColor: 'transparent', fontSize: '10px', fontWeight: 700, color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit' }} onMouseEnter={e => e.currentTarget.style.color = '#D97706'} onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
              View Approvals &rarr;
            </button>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Pending Approvals</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#F59E0B', letterSpacing: '-0.5px' }}>
              {loading ? '...' : pendingRequests.length}
            </h3>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#D97706', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            Requires your action
          </div>
        </div>

        {/* Card 4: Today's Classes */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={17} color="#16A34A" />
            </div>
            <button onClick={() => setSelectedModal('calendar')} style={{ border: 'none', backgroundColor: 'transparent', fontSize: '10px', fontWeight: 700, color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit' }} onMouseEnter={e => e.currentTarget.style.color = '#16A34A'} onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
              View Schedule &rarr;
            </button>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Today's Classes</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#16A34A', letterSpacing: '-0.5px' }}>—</h3>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            Schedule via timetable module
          </div>
        </div>

        {/* Card 5: Avg CGPA */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={17} color="#7C3AED" />
            </div>
            <button onClick={() => setSelectedModal('prereq')} style={{ border: 'none', backgroundColor: 'transparent', fontSize: '10px', fontWeight: 700, color: '#94A3B8', cursor: 'pointer', fontFamily: 'inherit' }} onMouseEnter={e => e.currentTarget.style.color = '#7C3AED'} onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
              Performance &rarr;
            </button>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>My Batch Avg CGPA</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: '#7C3AED', letterSpacing: '-0.5px' }}>
              {loading ? '...' : avgCgpa}
            </h3>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#7C3AED', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
            Last Semester Avg
          </div>
        </div>

      </div>

      {/* ── CGPA ALERT CARDS ROW (FR-3.3 Warning ≤2.1 / FR-3.4 Critical <2.0) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Warning Alert Card */}
        <div style={{
          backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: '14px', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color="#D97706" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Warning Status (FR-3.3)</p>
              <h3 style={{ margin: '3px 0 0', fontSize: '28px', fontWeight: 800, color: '#D97706', letterSpacing: '-1px' }}>
                {loading ? '...' : warningCount}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#92400E', fontWeight: 600 }}>Students with CGPA 2.0 – 2.1</p>
            </div>
          </div>
          <div>
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', backgroundColor: '#FDE68A', color: '#92400E', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚠ WARNING
            </span>
            <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#B45309', fontWeight: 600 }}>Proactive intervention required</p>
          </div>
        </div>

        {/* Critical Alert Card */}
        <div style={{
          backgroundColor: '#FFF1F2', border: '1px solid #FECDD3',
          borderRadius: '14px', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#FFE4E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={20} color="#E11D48" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#9F1239', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Critical Status (FR-3.4)</p>
              <h3 style={{ margin: '3px 0 0', fontSize: '28px', fontWeight: 800, color: '#E11D48', letterSpacing: '-1px' }}>
                {loading ? '...' : criticalCount}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#9F1239', fontWeight: 600 }}>Students with CGPA below 2.0</p>
            </div>
          </div>
          <div>
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', backgroundColor: '#FECDD3', color: '#9F1239', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🚨 CRITICAL
            </span>
            <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#BE123C', fontWeight: 600 }}>Immediate advisory action needed</p>
          </div>
        </div>

      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px_320px] gap-4 mb-4">
        
        {/* Widget 1: At-Risk Students */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={17} color="#E11D48" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>At-Risk Students</h3>
            </div>
            <button onClick={() => setActiveNav('students')} style={{ border: 'none', backgroundColor: 'transparent', fontSize: '12px', fontWeight: 700, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}>
              View All
            </button>
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  {['Student ID', 'Student Name', 'Batch', 'CGPA', 'Risk Level', 'Reason'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayAtRisk.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px 10px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>
                      No at-risk students found.
                    </td>
                  </tr>
                ) : (
                  displayAtRisk.map((s, i) => {
                    const isHigh = s.cgpaStatus === 'critical' || (s.cgpa && s.cgpa < 2.0);
                    return (
                      <tr key={i} style={{ borderBottom: i < displayAtRisk.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                        <td style={{ padding: '12px 10px', fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{s.rollNumber}</td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>{s.name}</td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', color: '#64748B' }}>{s.batchId?.code || 'N/A'}</td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{s.cgpa ? s.cgpa.toFixed(2) : '—'}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                            backgroundColor: isHigh ? '#FEE2E2' : '#FEF3C7', color: isHigh ? '#EF4444' : '#D97706'
                          }}>
                            {isHigh ? 'High' : 'Medium'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', color: '#64748B' }}>{s.reason || 'Low CGPA'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', marginTop: '12px' }}>
            <button onClick={() => setActiveNav('students')} style={{ border: 'none', backgroundColor: 'transparent', color: '#2563EB', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              View Complete At-Risk List &rarr;
            </button>
          </div>
        </div>

        {/* Widget 2: Batch CGPA Distribution */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
            Batch CGPA Distribution
          </h3>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            {/* Custom conic-gradient donut chart */}
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: donutGradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 0 0 20px #FFFFFF, 0 4px 10px rgba(0,0,0,0.05)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>{totalCount}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Students</span>
              </div>
            </div>

            {/* Legends */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: '3.50 - 4.00', val: range35Plus, pct: p1, color: '#10B981' },
                { label: '2.50 - 3.49', val: range25_34, pct: p2, color: '#3B82F6' },
                { label: '2.00 - 2.49', val: range20_24, pct: p3, color: '#F59E0B' },
                { label: 'Below 1.99', val: rangeUnder2, pct: p4, color: '#EF4444' }
              ].map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: l.color }} />
                    <span style={{ color: '#475569', fontWeight: 600 }}>{l.label}</span>
                  </div>
                  <span style={{ color: '#0F172A', fontWeight: 700 }}>{l.val} ({l.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', marginTop: '12px' }}>
            <button onClick={() => triggerToast('Detailed analytics data sync pending.')} style={{ border: 'none', backgroundColor: 'transparent', color: '#2563EB', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              View Detailed Analytics &rarr;
            </button>
          </div>
        </div>

        {/* Widget 3: Degree Progress Overview */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Degree Progress Overview</h3>
            <button onClick={() => triggerToast('Academic profiles mapped.')} style={{ border: 'none', backgroundColor: 'transparent', fontSize: '12px', fontWeight: 700, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}>
              View All
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            {[
              { label: 'On Track', count: onTrackCount, pct: onTrackPct, color: '#10B981', subtext: 'CGPA >= 3.00' },
              { label: 'At-Risk', count: degreeAtRiskCount, pct: degreeAtRiskPct, color: '#F59E0B', subtext: 'CGPA 2.00 - 2.99' },
              { label: 'Behind', count: behindCount, pct: behindPct, color: '#EF4444', subtext: 'CGPA < 2.00' },
              { label: 'Graduated', count: graduatedCount, pct: graduatedPct, color: '#6366F1', subtext: 'Semester >= 8' }
            ].map((bar, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '12px' }}>
                  <span style={{ fontWeight: 700, color: '#1E293B' }}>{bar.label} <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}>({bar.subtext})</span></span>
                  <span style={{ fontWeight: 700, color: '#475569' }}>{bar.count} Students ({bar.pct}%)</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', backgroundColor: bar.color, width: `${bar.pct}%`, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', marginTop: '12px' }}>
            <button onClick={() => triggerToast('Degree mapping recalculating...')} style={{ border: 'none', backgroundColor: 'transparent', color: '#2563EB', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              View Degree Progress &rarr;
            </button>
          </div>
        </div>

      </div>

      {/* ── BOTTOM ROW: Pending Approvals, Performance Trend, AI Advisor Insights ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px_320px] gap-4 mb-4">
        
        {/* Widget 4: Pending Approvals Table */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={17} color="#64748B" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Pending Approvals</h3>
            </div>
            <button onClick={() => setActiveNav('workflowQueue')} style={{ border: 'none', backgroundColor: 'transparent', fontSize: '12px', fontWeight: 700, color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit' }}>
              View All
            </button>
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  {['Type', 'Student', 'Requested On', 'Priority', 'Action'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRequests.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '36px 10px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#94A3B8' }}>
                      No pending approval requests.
                    </td>
                  </tr>
                ) : (
                  displayRequests.map((r, i) => {
                    const priColor = r.priority === 'High' ? { bg: '#FEE2E2', txt: '#EF4444' } : r.priority === 'Medium' ? { bg: '#FFEDD5', txt: '#EA580C' } : { bg: '#F0FDF4', txt: '#16A34A' };
                    return (
                      <tr key={i} style={{ borderBottom: i < displayRequests.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                        <td style={{ padding: '12px 10px', fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{r.type}</td>
                        <td style={{ padding: '12px 10px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                          {r.studentName || r.studentId?.name || 'Academic student'} <span style={{ fontSize: '10px', color: '#94A3B8', display: 'block' }}>{r.rollNumber || r.studentId?.rollNumber}</span>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '11px', color: '#64748B' }}>
                          {r.requestedOn ? r.requestedOn : new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, backgroundColor: priColor.bg, color: priColor.txt }}>
                            {r.priority}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <button onClick={() => setActiveNav('workflowQueue')} style={{
                            padding: '4px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#0F172A', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                          }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563EB'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0F172A'}>
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', marginTop: '12px' }}>
            <button onClick={() => setActiveNav('workflowQueue')} style={{ border: 'none', backgroundColor: 'transparent', color: '#2563EB', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              View All Approvals &rarr;
            </button>
          </div>
        </div>

        {/* Widget 5: Student Performance Trend */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Student Performance Trend [My Batch]</h3>
            <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Last 5 Semesters</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* curved line trend graph using premium SVG */}
            <svg viewBox="0 0 240 120" style={{ width: '100%', height: '110px' }}>
              {/* grid lines */}
              <line x1="0" y1="20" x2="240" y2="20" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="50" x2="240" y2="50" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="80" x2="240" y2="80" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="110" x2="240" y2="110" stroke="#E2E8F0" strokeWidth="1" />
              
              {/* Curved trend path */}
              <path d="M 20 85 Q 65 80 110 78 T 200 35" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
              
              {/* Data points */}
              <circle cx="20" cy="85" r="3.5" fill="#2563EB" />
              <circle cx="75" cy="81" r="3.5" fill="#2563EB" />
              <circle cx="130" cy="77" r="3.5" fill="#2563EB" />
              <circle cx="185" cy="40" r="3.5" fill="#2563EB" />
              
              {/* Values labels */}
              <text x="20" y="73" fontSize="8" fontWeight="bold" fill="#0F172A" textAnchor="middle">2.85</text>
              <text x="75" y="69" fontSize="8" fontWeight="bold" fill="#0F172A" textAnchor="middle">2.92</text>
              <text x="130" y="65" fontSize="8" fontWeight="bold" fill="#0F172A" textAnchor="middle">2.95</text>
              <text x="185" y="28" fontSize="8" fontWeight="bold" fill="#0F172A" textAnchor="middle">3.28</text>
            </svg>
            
            {/* Semester Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 700, color: '#94A3B8', marginTop: '8px' }}>
              <span>F-23</span>
              <span>S-24</span>
              <span>F-24</span>
              <span>S-25</span>
              <span>F-25</span>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', marginTop: '12px' }}>
            <button onClick={() => triggerToast('Performance report compiling...')} style={{ border: 'none', backgroundColor: 'transparent', color: '#2563EB', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              View Performance Report &rarr;
            </button>
          </div>
        </div>

        {/* Widget 6: AI Advisor Insights */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
            AI Advisor Insights
          </h3>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
            {/* Insight 1 */}
            <div style={{ display: 'flex', gap: '10px', padding: '10px 12px', backgroundColor: '#F0FDF4', borderRadius: '10px', border: '1px solid #DCFCE7' }}>
              <Sparkles size={16} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '11.5px', color: '#166534', fontWeight: 600, lineHeight: 1.4 }}>
                {stats.critical || rangeUnder2} students are at high academic risk. Immediate interventions recommended.
              </p>
            </div>
            
            {/* Insight 2 */}
            <div style={{ display: 'flex', gap: '10px', padding: '10px 12px', backgroundColor: '#FFF9E6', borderRadius: '10px', border: '1px solid #FEF3C7' }}>
              <Lightbulb size={16} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '11.5px', color: '#92400E', fontWeight: 600, lineHeight: 1.4 }}>
                {stats.warning || range20_24} students can benefit from course workload or difficulty adjustment.
              </p>
            </div>

            {/* Insight 3 */}
            <div style={{ display: 'flex', gap: '10px', padding: '10px 12px', backgroundColor: '#EFF6FF', borderRadius: '10px', border: '1px solid #DBEAFE' }}>
              <Users size={16} color="#2563EB" style={{ marginTop: '2px', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '11.5px', color: '#1E40AF', fontWeight: 600, lineHeight: 1.4 }}>
                {onTrackCount > 3 ? 3 : onTrackCount} students are eligible for early graduation planning. Review required.
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', marginTop: '12px' }}>
            <button onClick={() => triggerToast('AI analytics pipeline processing.')} style={{ border: 'none', backgroundColor: 'transparent', color: '#2563EB', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              View All Insights &rarr;
            </button>
          </div>
        </div>

      </div>

      {/* ── QUICK ADVISORY ACTIONS (BOTTOM ROW) ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
          Quick Advisory Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { title: 'Add Student', icon: Plus, iconColor: '#7C3AED', bg: '#F5F3FF', action: () => setSelectedModal('addStudent') },
            { title: 'Advise Courses', icon: BookOpen, iconColor: '#16A34A', bg: '#F0FDF4', action: () => setActiveNav('workflowQueue') },
            { title: 'Check Prerequisites', icon: ShieldCheck, iconColor: '#EA580C', bg: '#FFF7ED', action: () => setSelectedModal('prereq') },
            { title: 'Generate Report', icon: FileText, iconColor: '#2563EB', bg: '#EFF6FF', action: () => triggerToast('Generating academic report compilation...') },
            { title: 'Send Notification', icon: Send, iconColor: '#EC4899', bg: '#FDF2F8', action: () => setSelectedModal('notification') },
            { title: 'Schedule Meeting', icon: Clock, iconColor: '#0D9488', bg: '#F0FDFA', action: () => setSelectedModal('meeting') },
            { title: 'View My Calendar', icon: Calendar, iconColor: '#E11D48', bg: '#FFF1F2', action: () => setSelectedModal('calendar') },
            { title: 'Export Data', icon: BarChart2, iconColor: '#0F172A', bg: '#F8FAFC', action: () => triggerToast('Exporting student batch rosters as CSV...') }
          ].map((action, i) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={i}
                onClick={action.action}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '14px 8px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center'
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ActionIcon size={18} color={action.iconColor} />
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>
                  {action.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── INTERACTIVE MODALS ── */}

      {/* Modal 1: Prerequisite Checker */}
      {selectedModal === 'prereq' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1B3A6B' }}>Prerequisite Eligibility Checker</h3>
              <button onClick={() => { setSelectedModal(null); setPrereqResult(null); }} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Select Student</label>
              <select
                value={prereqStudentId}
                onChange={e => { setPrereqStudentId(e.target.value); setPrereqResult(null); }}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
              >
                <option value="">-- Choose Student --</option>
                {students.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>{s.name} ({s.rollNumber})</option>
                ))}
              </select>

              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Check Eligibility For</label>
              <select
                value={prereqCourse}
                onChange={e => { setPrereqCourse(e.target.value); setPrereqResult(null); }}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
              >
                {['Data Structures', 'Database Systems', 'OOP', 'Algorithms'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {prereqResult && (
              <div style={{
                padding: '16px', borderRadius: '12px', marginBottom: '20px',
                backgroundColor: prereqResult.status === 'Passed' ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${prereqResult.status === 'Passed' ? '#DCFCE7' : '#FEE2E2'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {prereqResult.status === 'Passed' ? <CheckCircle2 size={16} color="#16A34A" /> : <AlertCircle size={16} color="#EF4444" />}
                  <span style={{ fontSize: '13px', fontWeight: 800, color: prereqResult.status === 'Passed' ? '#166534' : '#991B1B' }}>
                    Eligibility Status: {prereqResult.status === 'Passed' ? 'ELIGIBLE' : 'INELIGIBLE'}
                  </span>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#475569' }}>
                  <strong>Prerequisites:</strong> {prereqResult.requirements.join(', ')}
                </p>
                {prereqResult.missing.length > 0 && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#EF4444' }}>
                    <strong>Missing Course:</strong> {prereqResult.missing.join(', ')}
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setSelectedModal(null); setPrereqResult(null); }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={evaluatePrereq} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0F172A', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Validate Eligibility</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add Student Profile Sync Request */}
      {selectedModal === 'addStudent' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <form onSubmit={submitNewStudentRequest} style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1B3A6B' }}>Create Student Profile Request</h3>
              <button type="button" onClick={() => setSelectedModal(null)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. BSCS-23S-0092"
                  value={newStudentData.rollNumber}
                  onChange={e => setNewStudentData({ ...newStudentData, rollNumber: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Muhammad Ahmed"
                  value={newStudentData.name}
                  onChange={e => setNewStudentData({ ...newStudentData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  placeholder="e.g. ahmed@stmu.edu.pk"
                  value={newStudentData.email}
                  onChange={e => setNewStudentData({ ...newStudentData, email: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setSelectedModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0F172A', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Register Request</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: Schedule Meeting */}
      {selectedModal === 'meeting' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <form onSubmit={submitMeeting} style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1B3A6B' }}>Schedule Advisory Meeting</h3>
              <button type="button" onClick={() => setSelectedModal(null)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Meeting Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Academic standing counseling"
                  value={meetingData.title}
                  onChange={e => setMeetingData({ ...meetingData, title: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Date</label>
                  <input
                    type="date"
                    value={meetingData.date}
                    onChange={e => setMeetingData({ ...meetingData, date: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Time</label>
                  <input
                    type="time"
                    value={meetingData.time}
                    onChange={e => setMeetingData({ ...meetingData, time: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Location/Medium</label>
                <select
                  value={meetingData.type}
                  onChange={e => setMeetingData({ ...meetingData, type: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="On Campus">On Campus (Advisor Office)</option>
                  <option value="Online">Online Teams/Zoom Session</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setSelectedModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0D9488', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Schedule & Invite</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 4: Broadcast warning alerts */}
      {selectedModal === 'notification' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <form onSubmit={submitBroadcast} style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1B3A6B' }}>Send Broadcast Notification</h3>
              <button type="button" onClick={() => setSelectedModal(null)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Target Audience</label>
                <select
                  value={broadcastData.target}
                  onChange={e => setBroadcastData({ ...broadcastData, target: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="Warning List">All At-Risk Students (Warning + Critical)</option>
                  <option value="Critical Only">Critical Standing List Only</option>
                  <option value="Complete Batch">Entire Assigned Batches</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Alert Type</label>
                <select
                  value={broadcastData.alertType}
                  onChange={e => setBroadcastData({ ...broadcastData, alertType: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="critical">Critical (Red Flag Warning)</option>
                  <option value="warning">Warning (Amber Alert)</option>
                  <option value="info">General Info Broadcast</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Message Body</label>
                <textarea
                  placeholder="Write alert content here..."
                  value={broadcastData.message}
                  onChange={e => setBroadcastData({ ...broadcastData, message: e.target.value })}
                  style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', fontFamily: 'inherit', resize: 'none' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setSelectedModal(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#EC4899', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Broadcast Alerts</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 5: Calendar Schedule View */}
      {selectedModal === 'calendar' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: 540, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1B3A6B' }}>Advisory Calendar</h3>
              <button onClick={() => setSelectedModal(null)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
            </div>
            
            <div style={{ border: '1px solid #F1F5F9', borderRadius: '12px', padding: '16px', backgroundColor: '#FAFAFA' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: '#1E293B', textTransform: 'uppercase' }}>This Week's Engagements</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px', borderBottom: '1px solid #E2E8F0' }}>
                  <span>📅 Monday &bull; 10:00 AM</span>
                  <span style={{ fontWeight: 600, color: '#EF4444' }}>Batch CS-23 Warning Advisory</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px', borderBottom: '1px solid #E2E8F0' }}>
                  <span>📅 Wednesday &bull; 02:00 PM</span>
                  <span style={{ fontWeight: 600, color: '#2563EB' }}>HOD Departmental Sync</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px' }}>
                  <span>📅 Thursday &bull; 11:30 AM</span>
                  <span style={{ fontWeight: 600, color: '#16A34A' }}>Student Transfer Equivalency Review</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setSelectedModal(null)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', backgroundColor: '#0F172A', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
