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
    const summaryUrl = selectedBatch && selectedBatch !== 'all'
        ? `/api/advisor/dashboard-summary?batchId=${selectedBatch}`
        : '/api/advisor/dashboard-summary';
      const studentsUrl = selectedBatch && selectedBatch !== 'all'
        ? `/api/advisor/students?limit=500&batchId=${selectedBatch}`
        : '/api/advisor/students?limit=500';

      // Fetch all three endpoints concurrently
      const [summaryRes, studentsRes, requestsRes] = await Promise.all([
        fetch(summaryUrl),
        fetch(studentsUrl),
        fetch('/api/advisor/requests')
      ]);

      // Read all response bodies concurrently
      const [summaryText, studentsText, requestsText] = await Promise.all([
        summaryRes.text(),
        studentsRes.text(),
        requestsRes.text()
      ]);

      const summaryData = summaryText ? JSON.parse(summaryText) : {};
      if (summaryRes.ok && summaryData.status === 'success') {
        setStats(summaryData.data.stats || { total: 0, good: 0, warning: 0, critical: 0 });
      }

      const studentsData = studentsText ? JSON.parse(studentsText) : {};
      if (studentsRes.ok && studentsData.status === 'success') {
        setStudents(studentsData.data.students || []);
      }

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
          Contact your Dean to get assigned to your academic batches.
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
  const onTrackCount = students.filter(s => (s.cgpa || 0) >= 3.0).length;
  const satisfactoryCount = students.filter(s => (s.cgpa || 0) >= 2.2 && (s.cgpa || 0) < 3.0).length;
  const degreeAtRiskCount = students.filter(s => (s.cgpa || 0) < 2.2).length;
  const graduatedCount = students.filter(s => s.currentSemester >= 8).length;

  const onTrackPct = totalCount > 0 ? ((onTrackCount / totalCount) * 100).toFixed(1) : '0.0';
  const satisfactoryPct = totalCount > 0 ? ((satisfactoryCount / totalCount) * 100).toFixed(1) : '0.0';
  const degreeAtRiskPct = totalCount > 0 ? ((degreeAtRiskCount / totalCount) * 100).toFixed(1) : '0.0';
  const graduatedPct = totalCount > 0 ? ((graduatedCount / totalCount) * 100).toFixed(1) : '0.0';

  // Real DB data only — no fallbacks
  const atRiskStudents = students.filter(s => s.cgpaStatus === 'warning' || s.cgpaStatus === 'critical');
  const displayAtRisk = atRiskStudents.slice(0, 5);

  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'Pending' || r.status === 'Pending Advisor');
  const displayRequests = pendingRequests.slice(0, 5);

  // Semester Trend — real data derived from student courses
  const GRADE_POINTS = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.67,
    'B+': 3.33, 'B': 3.0, 'B-': 2.67,
    'C+': 2.33, 'C': 2.0, 'C-': 1.67,
    'D+': 1.33, 'D': 1.0, 'F': 0.0
  };

  const semAggregator = {}; 

  students.forEach(s => {
    if (s.courses && s.courses.length > 0) {
      const maxSem = Math.max(...s.courses.map(c => c.semester || 1));
      
      for (let sem = 1; sem <= maxSem; sem++) {
        const coursesUpTo = s.courses.filter(c => (c.semester || 1) <= sem && c.grade && GRADE_POINTS[c.grade] !== undefined);
        let pts = 0;
        let cr = 0;
        coursesUpTo.forEach(c => {
          const ch = c.creditHours || 3;
          pts += GRADE_POINTS[c.grade] * ch;
          cr += ch;
        });
        if (cr > 0) {
          if (!semAggregator[sem]) semAggregator[sem] = [];
          semAggregator[sem].push(pts / cr);
        }
      }
    }
  });

  const availableSems = Object.keys(semAggregator).map(Number).sort((a,b) => a - b);
  const recentSems = availableSems; // Show all available semesters
  
  let finalTrendSems = [];
  let finalTrendGpas = [];
  
  if (recentSems.length > 0) {
    recentSems.forEach(sem => {
      const gpas = semAggregator[sem];
      const avg = gpas.reduce((a, b) => a + b, 0) / gpas.length;
      finalTrendSems.push(sem);
      finalTrendGpas.push(parseFloat(avg.toFixed(2)));
    });
  } else {
    finalTrendSems = [];
    finalTrendGpas = [];
  }

  const renderTrendSvg = () => {
    const n = finalTrendGpas.length;
    if (n === 0) return (
      <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
        No course records available yet.
      </div>
    );
    
    const xCoords = finalTrendGpas.map((_, i) => n === 1 ? 200 : 20 + (i * (360 / (n - 1))));
    
    const minGpa = Math.max(0, Math.min(...finalTrendGpas) - 0.2);
    const maxGpa = Math.min(4.0, Math.max(...finalTrendGpas) + 0.2);
    const range = maxGpa - minGpa || 1;
    
    const getY = (gpa) => 95 - ((gpa - minGpa) / range) * 75;
    
    const points = finalTrendGpas.map((gpa, i) => ({ x: xCoords[i], y: getY(gpa), gpa }));
    
    let pathD = "";
    if (points.length > 1) {
      pathD = `M ${points[0].x} ${points[0].y} `;
      for (let i = 1; i < points.length; i++) {
         pathD += `L ${points[i].x} ${points[i].y} `;
      }
    }
    
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <svg viewBox="0 0 400 135" style={{ width: '100%', maxHeight: '160px', overflow: 'visible' }}>
          <line x1="0" y1="20" x2="400" y2="20" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="0" y1="50" x2="400" y2="50" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="0" y1="80" x2="400" y2="80" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="0" y1="110" x2="400" y2="110" stroke="#E2E8F0" strokeWidth="1" />
          
          {pathD && <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          
          {points.map((pt, i) => (
            <React.Fragment key={i}>
              <circle cx={pt.x} cy={pt.y} r="3.5" fill="#2563EB" />
              <text x={pt.x} y={pt.y - 8} fontSize="9" fontWeight="bold" fill="#0F172A" textAnchor="middle">{pt.gpa.toFixed(2)}</text>
              <text x={pt.x} y={128} fontSize="8" fontWeight="700" fill="#94A3B8" textAnchor="middle">Sem {finalTrendSems[i]}</text>
            </React.Fragment>
          ))}
        </svg>
      </div>
    );
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
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1100,
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

      {/* ── FOUR METRIC CARDS ROW ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
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



        {/* Card 5: Avg CGPA */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={17} color="#7C3AED" />
            </div>
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

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px', padding: '10px 0' }}>
            {/* Custom conic-gradient donut chart */}
            <div style={{
              width: '140px', height: '140px', borderRadius: '50%',
              background: donutGradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              position: 'relative'
            }}>
              {/* Inner white circle to create the donut hole */}
              <div style={{ 
                width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#FFFFFF',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)'
              }}>
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', lineHeight: '1' }}>{totalCount}</span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginTop: '4px', letterSpacing: '0.5px' }}>Students</span>
              </div>
            </div>

            {/* Legends */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 8px' }}>
              {[
                { label: '3.50 - 4.00', val: range35Plus, pct: p1, color: '#10B981' },
                { label: '2.50 - 3.49', val: range25_34, pct: p2, color: '#3B82F6' },
                { label: '2.00 - 2.49', val: range20_24, pct: p3, color: '#F59E0B' },
                { label: 'Below 1.99', val: rangeUnder2, pct: p4, color: '#EF4444' }
              ].map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: l.color }} />
                    <span style={{ color: '#475569', fontWeight: 600 }}>{l.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#0F172A', fontWeight: 700 }}>{l.val}</span>
                    <span style={{ color: '#94A3B8', fontWeight: 600, fontSize: '11px', width: '36px', textAlign: 'right' }}>({l.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Widget 3: Degree Progress Overview */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Degree Progress Overview</h3>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            {[
              { label: 'On Track', count: onTrackCount, pct: onTrackPct, color: '#10B981', subtext: '≥ 3.00' },
              { label: 'Satisfactory', count: satisfactoryCount, pct: satisfactoryPct, color: '#3B82F6', subtext: '2.20 - 2.99' },
              { label: 'At-Risk', count: degreeAtRiskCount, pct: degreeAtRiskPct, color: '#EF4444', subtext: '< 2.20' },
              { label: 'Graduated', count: graduatedCount, pct: graduatedPct, color: '#6366F1', subtext: 'Sem 8+' }
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
        </div>

      </div>

      {/* ── BOTTOM ROW: Pending Approvals, Performance Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px] gap-4 mb-4">
        
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
            <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>All Semesters</span>
          </div>

          {renderTrendSvg()}
        </div>


      </div>

      {/* ── QUICK ADVISORY ACTIONS (BOTTOM ROW) ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A', paddingBottom: '16px', borderBottom: '1px solid #F1F5F9' }}>
          Quick Advisory Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { title: 'Advise Courses', icon: BookOpen, iconColor: '#16A34A', bg: '#F0FDF4', action: () => setActiveNav('workflowQueue') },
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
