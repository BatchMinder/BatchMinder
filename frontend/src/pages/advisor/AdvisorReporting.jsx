// AdvisorReporting.jsx
// Updated configuration dashboard for parameter filters (FR-6.1)

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart2, TrendingUp, Users, AlertTriangle, Download,
  RefreshCw, Filter, BookOpen, CheckCircle, Layers, FileText,
  PieChart as PieIcon, LineChart as LineIcon, Save, History, Search, Trash2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  getSavedSnapshots, saveSnapshot, deleteSnapshot, 
  fetchReportingStats, fetchCgpaDistribution, fetchStudentsByBatch, fetchAtRiskTrend 
} from '../../services/reportService';
import { downloadBatchTranscripts } from '../../services/transcriptService';
import { CircularProgress } from '@mui/material';

export default function AdvisorReporting() {
  const { user } = useAuth();
  
  // Dashboard Analytics States
  const [stats, setStats] = useState(null);
  const [cgpaDist, setCgpaDist] = useState([]);
  const [studentsByBatch, setStudentsByBatch] = useState([]);
  const [atRiskTrend, setAtRiskTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBatch, setFilterBatch] = useState('all');
  const [analyticsReportType, setAnalyticsReportType] = useState('performance');

  // Custom Report Builder States (FR-6.1 Configuration & Parameter Filters)
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filterDept, setFilterDept] = useState('all');
  const [filterQueryBatch, setFilterQueryBatch] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterStanding, setFilterStanding] = useState('all');
  const [minGpa, setMinGpa] = useState('0.0');
  const [maxGpa, setMaxGpa] = useState('4.0');
  
  const [queryResults, setQueryResults] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [selectedStudentsForTranscript, setSelectedStudentsForTranscript] = useState({});
  const [selectAll, setSelectAll] = useState(false);

  // Snapshot States
  const [savedSnapshots, setSavedSnapshots] = useState([]);
  const [snapshotNameInput, setSnapshotNameInput] = useState('');
  
  // Tab Controller
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'builder', 'snapshots'

  useEffect(() => {
    fetchAllAnalytics();
    fetchFilterOptions();
    loadSnapshotsList();
  }, []);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const [statsData, distData, batchData, trendData] = await Promise.all([
        fetchReportingStats(),
        fetchCgpaDistribution(),
        fetchStudentsByBatch(),
        fetchAtRiskTrend()
      ]);
      
      const rawStats = statsData.data || {};
      setStats({
        students: rawStats.totalStudents ?? rawStats.students?.total ?? 0,
        atRisk: rawStats.atRiskStudents ?? 0,
        batches: rawStats.totalBatches ?? rawStats.batches?.total ?? 0,
        departments: rawStats.departments?.length ?? 0
      });

      const distLabels = distData.data?.labels || [];
      const distCounts = distData.data?.counts || [];
      setCgpaDist(distLabels.map((label, i) => ({ label, count: distCounts[i] || 0 })));

      setStudentsByBatch(batchData.data || []);
      
      const rawTrend = trendData.data || [];
      setAtRiskTrend(rawTrend.map(p => ({
        label: p.month,
        count: (p.warning || 0) + (p.critical || 0)
      })).filter(p => p.count > 0));

    } catch (e) {
      console.error('Reporting fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [deptRes, batchRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/batches')
      ]);
      if (deptRes.ok) {
        const d = await deptRes.json();
        setDepartments(d.data?.departments || d.data || []);
      }
      if (batchRes.ok) {
        const b = await batchRes.json();
        setBatches(b.data?.batches || b.data || []);
      }
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  const loadSnapshotsList = () => {
    setSavedSnapshots(getSavedSnapshots());
  };

  // Run Custom Configured Query (FR-6.1 Querying)
  const handleRunQuery = async () => {
    setQueryLoading(true);
    setSelectedStudentsForTranscript({});
    setSelectAll(false);
    try {
      const params = new URLSearchParams();
      params.append('limit', '500'); // Pull matching records for precise analysis
      if (filterQueryBatch !== 'all') params.append('batch', filterQueryBatch);
      if (filterDept !== 'all') params.append('department', filterDept);
      if (filterStanding !== 'all') params.append('cgpaStatus', filterStanding);

      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        let studentsList = data.data.students || [];

        // Apply GPA range and Semester client-side filters for instant precision
        studentsList = studentsList.filter(s => {
          const gpaVal = s.cgpa || 0;
          const matchGpa = gpaVal >= parseFloat(minGpa) && gpaVal <= parseFloat(maxGpa);
          const matchSem = filterSemester === 'all' || String(s.currentSemester) === String(filterSemester);
          return matchGpa && matchSem;
        });

        setQueryResults(studentsList);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to run query filters');
    } finally {
      setQueryLoading(false);
    }
  };

  // Store snap parameters configuration summary (FR-6.1 Storing Snapshots)
  const handleSaveSnapshot = () => {
    if (!snapshotNameInput.trim()) {
      alert('Please enter a name for the report snapshot.');
      return;
    }

    const filters = {
      department: filterDept,
      batch: filterQueryBatch,
      semester: filterSemester,
      standing: filterStanding,
      gpaRange: `${minGpa} – ${maxGpa}`
    };

    const summary = {
      totalMatchingStudents: queryResults.length,
      averageCgpa: queryResults.length > 0 
        ? parseFloat((queryResults.reduce((sum, s) => sum + (s.cgpa || 0), 0) / queryResults.length).toFixed(2))
        : 0.00
    };

    const saved = saveSnapshot(snapshotNameInput.trim(), 'custom_query', filters, summary);
    if (saved) {
      setSnapshotNameInput('');
      loadSnapshotsList();
      alert('Report snapshot stored successfully!');
    }
  };

  const handleDeleteSnapshotClick = (id) => {
    if (confirm('Are you sure you want to delete this report snapshot?')) {
      deleteSnapshot(id);
      loadSnapshotsList();
    }
  };

  const handleLoadSnapshot = (snap) => {
    setFilterDept(snap.filters.department || 'all');
    setFilterQueryBatch(snap.filters.batch || 'all');
    setFilterSemester(snap.filters.semester || 'all');
    setFilterStanding(snap.filters.standing || 'all');
    
    if (snap.filters.gpaRange) {
      const [min, max] = snap.filters.gpaRange.split(' – ');
      setMinGpa(min || '0.0');
      setMaxGpa(max || '4.0');
    }
    
    setActiveTab('builder');
    alert(`Snapshot "${snap.name}" filters loaded! Click "Execute Configuration Query" to run.`);
  };

  // Checkbox handlers
  const handleSelectAllChange = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    const selected = {};
    if (checked) {
      queryResults.forEach(s => {
        selected[s._id] = true;
      });
    }
    setSelectedStudentsForTranscript(selected);
  };

  const handleStudentSelectChange = (id, checked) => {
    setSelectedStudentsForTranscript(prev => {
      const updated = { ...prev, [id]: checked };
      if (!checked) setSelectAll(false);
      return updated;
    });
  };

  const handleBatchTranscriptPrint = () => {
    const ids = Object.keys(selectedStudentsForTranscript).filter(id => selectedStudentsForTranscript[id]);
    if (ids.length === 0) {
      alert('Please select at least one student checkbox to print transcripts.');
      return;
    }
    downloadBatchTranscripts(ids);
  };

  // Filtered batch analytics data
  const batchOptions = studentsByBatch.map(b => b.batchCode).filter(Boolean);
  const filteredBatchData = filterBatch === 'all' ? studentsByBatch : studentsByBatch.filter(b => b.batchCode === filterBatch);

  // CGPA band labels
  const cgpaBands = [
    { label: 'Good Standing (≥2.5)', color: '#10B981', labelKey: 'good' },
    { label: 'Warning (2.0–2.49)', color: '#F59E0B', labelKey: 'warning' },
    { label: 'Critical (<2.0)', color: '#EF4444', labelKey: 'critical' }
  ];

  // Raw dataset export
  const exportCSV = (reportTypeOverride) => {
    const activeReport = reportTypeOverride || analyticsReportType;
    let rows = [];
    let filename = 'batchminder_report.csv';

    if (activeReport === 'performance') {
      filename = `academic_performance_report_${new Date().toISOString().split('T')[0]}.csv`;
      rows = [
        ['Report Name', 'Academic Performance & CGPA Distribution Report'],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['CGPA Standing Band', 'Student Count'],
        ...cgpaDist.map(d => [
          d.label === 'good' ? 'Good Standing (CGPA >= 2.50)' : d.label === 'warning' ? 'Warning Standing (2.00 <= CGPA < 2.50)' : 'Critical Standing (CGPA < 2.00)',
          d.count
        ])
      ];
    } else if (activeReport === 'enrollment') {
      filename = `batch_enrollment_report_${new Date().toISOString().split('T')[0]}.csv`;
      rows = [
        ['Report Name', 'Batch Enrollment Summary Report'],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['Batch Code', 'Total Students', 'Active Students', 'At-Risk Students'],
        ...studentsByBatch.map(b => [b.batchCode, b.total, b.active, b.atRisk])
      ];
    } else if (activeReport === 'risk') {
      filename = `at_risk_monitoring_report_${new Date().toISOString().split('T')[0]}.csv`;
      rows = [
        ['Report Name', 'AI Academic Risk Summary'],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['Alert Standing', 'Count'],
        ['Total At Risk', stats?.atRisk || 0]
      ];
    }

    const csvContent = rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const titlePrefix = user?.role === 'admin' ? 'HOD Departmental' : 'Advisor Batch';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }} className="animate-fade-in">

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="w-full md:flex-1">
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Academic Intelligence & Monitoring
          </p>
          <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            {titlePrefix} Reports & Analytics
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748B' }}>
            Configure multi-parameter parameters, query records grids, and store snapshot summaries.
          </p>
        </div>
      </div>

      {/* Primary Module Sub-Navigation tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', gap: '24px', paddingBottom: '2px' }}>
        {[
          { id: 'analytics', label: 'Dashboard Analytics', icon: BarChart2 },
          { id: 'builder', label: 'Custom Report Builder', icon: Filter },
          { id: 'snapshots', label: 'Saved Snapshots Log', icon: History }
        ].map(tab => {
          const TabIcon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px 14px',
                border: 'none', background: 'none', borderBottom: isSelected ? '3px solid #2563EB' : '3px solid transparent',
                color: isSelected ? '#2563EB' : '#64748B', fontWeight: isSelected ? 800 : 500, fontSize: '13px',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
              }}
            >
              <TabIcon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: DASHBOARD ANALYTICS ── */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Stats Summaries cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Enrolled', value: stats?.students ?? '—', color: '#2563EB', bg: '#EFF6FF', icon: Users },
              { label: 'Good Standing', value: cgpaDist.find(d => d.label === 'good')?.count ?? 0, color: '#10B981', bg: '#EFFDF5', icon: CheckCircle },
              { label: 'Academic Warning', value: cgpaDist.find(d => d.label === 'warning')?.count ?? 0, color: '#F59E0B', bg: '#FFFBEB', icon: AlertTriangle },
              { label: 'Critical / At-Risk', value: cgpaDist.find(d => d.label === 'critical')?.count ?? 0, color: '#EF4444', bg: '#FEF2F2', icon: AlertTriangle }
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} style={{
                backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px',
                padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '9px', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={17} color={color} />
                  </div>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
                  <h3 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: loading ? '#CBD5E1' : '#1F2937' }}>
                    {loading ? '...' : value}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          {/* Sub-report options switcher */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {['performance', 'enrollment', 'risk'].map(type => (
              <button
                key={type}
                onClick={() => setAnalyticsReportType(type)}
                style={{
                  padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px',
                  backgroundColor: analyticsReportType === type ? '#F1F5F9' : '#fff',
                  fontWeight: 700, color: '#475569', cursor: 'pointer'
                }}
              >
                {type === 'performance' ? 'CGPA Standings Chart' : type === 'enrollment' ? 'Batch Ingestion Chart' : 'Risk Forecast Graph'}
              </button>
            ))}
          </div>

          {/* Recharts Panels */}
          {analyticsReportType === 'performance' && (
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
              <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 700 }}>CGPA Metrics Summary</h4>
                <div style={{ height: '280px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cgpaDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tickFormatter={(v) => v === 'good' ? 'Good Standing' : v === 'warning' ? 'Warning' : 'Critical'} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <RechartsTooltip cursor={{ fill: '#F8FAFC' }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {cgpaDist.map((entry, idx) => {
                          const colors = { good: '#10B981', warning: '#F59E0B', critical: '#EF4444' };
                          return <Cell key={`cell-${idx}`} fill={colors[entry.label] || '#4F46E5'} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 700 }}>CGPA Standing Division</h4>
                <div style={{ height: '180px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={cgpaDist} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="count" nameKey="label">
                        {cgpaDist.map((entry, index) => {
                          const displayMap = { good: '#10B981', warning: '#F59E0B', critical: '#EF4444' };
                          return <Cell key={`cell-${index}`} fill={displayMap[entry.label] || '#94A3B8'} />;
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {cgpaBands.map((band, idx) => {
                    const val = cgpaDist.find(d => d.label === band.labelKey)?.count ?? 0;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: band.color }} />
                          <span style={{ color: '#475569', fontWeight: 500 }}>{band.label}</span>
                        </div>
                        <strong style={{ color: '#1E293B' }}>{val} ({stats?.students > 0 ? ((val / stats.students) * 100).toFixed(0) : 0}%)</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {analyticsReportType === 'enrollment' && (
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>Batch Enrollment Statistics</h4>
                <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 700 }}>
                  <option value="all">All Batches</option>
                  {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredBatchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="batchCode" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="total" name="Total Students" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="active" name="Active" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="atRisk" name="At-Risk" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {analyticsReportType === 'risk' && (
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 700 }}>Risk Historical Forecasting</h4>
              <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={atRiskTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="count" name="At-Risk" stroke="#EF4444" strokeWidth={3} dot={{ fill: '#EF4444' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CUSTOM REPORT BUILDER (FR-6.1 PARAMETER FILTERS) ── */}
      {activeTab === 'builder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Glassmorphic Parameter Filters Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px',
            backgroundColor: '#fff', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
            {/* Department */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>Department</label>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12.5px', outline: 'none', fontFamily: 'inherit' }}>
                <option value="all">All Departments</option>
                {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
              </select>
            </div>

            {/* Batch */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>Batch</label>
              <select value={filterQueryBatch} onChange={e => setFilterQueryBatch(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12.5px', outline: 'none', fontFamily: 'inherit' }}>
                <option value="all">All Batches</option>
                {batches.map(b => <option key={b._id} value={b.code}>{b.code}</option>)}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>Semester</label>
              <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12.5px', outline: 'none', fontFamily: 'inherit' }}>
                <option value="all">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            {/* Standing */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>Standing</label>
              <select value={filterStanding} onChange={e => setFilterStanding(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12.5px', outline: 'none', fontFamily: 'inherit' }}>
                <option value="all">All Standings</option>
                <option value="good_standing">Good Standing</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* GPA Ranges */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>Min GPA</label>
                <input type="number" min="0.0" max="4.0" step="0.1" value={minGpa} onChange={e => setMinGpa(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12.5px', outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>Max GPA</label>
                <input type="number" min="0.0" max="4.0" step="0.1" value={maxGpa} onChange={e => setMaxGpa(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12.5px', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={handleRunQuery}
              disabled={queryLoading}
              style={{
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                backgroundColor: '#2563EB', color: '#fff', fontSize: '13px',
                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {queryLoading ? <CircularProgress size={14} color="inherit" /> : <Search size={14} />}
              <span>Execute Configuration Query</span>
            </button>
          </div>

          {/* Query Results & snapshot creator */}
          {queryResults.length > 0 && (
            <div style={{
              backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px',
              padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px'
            }}>
              
              {/* Snapshot Creator Bar (FR-6.1 Snapshot storing) */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={15} color="#2563EB" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Save Custom Query Snapshot:</span>
                  <input
                    type="text"
                    placeholder="Snapshot Name (e.g. CS-2022 Low GPA)..."
                    value={snapshotNameInput}
                    onChange={e => setSnapshotNameInput(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '12px', width: '220px', outline: 'none' }}
                  />
                </div>
                <button
                  onClick={handleSaveSnapshot}
                  style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', backgroundColor: '#10B981', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Store Snapshot
                </button>
              </div>

              {/* Grid Header and batch triggers */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>
                  Query Result Grid ({queryResults.length} records matching)
                </span>
                
                {/* Batch Actions */}
                <button
                  onClick={handleBatchTranscriptPrint}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                    borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#fff',
                    fontSize: '12px', fontWeight: 700, color: '#475569', cursor: 'pointer'
                  }}
                >
                  <Download size={12} /> Print Selected Transcripts ({Object.values(selectedStudentsForTranscript).filter(Boolean).length})
                </button>
              </div>

              {/* Grid Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: '#FAFAFA', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px', width: '40px' }}>
                        <input type="checkbox" checked={selectAll} onChange={handleSelectAllChange} />
                      </th>
                      <th style={{ padding: '10px 12px' }}>Roll Number</th>
                      <th style={{ padding: '10px 12px' }}>Student Name</th>
                      <th style={{ padding: '10px 12px' }}>Semester</th>
                      <th style={{ padding: '10px 12px' }}>CGPA</th>
                      <th style={{ padding: '10px 12px' }}>Standing Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryResults.map(s => (
                      <tr key={s._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="checkbox"
                            checked={!!selectedStudentsForTranscript[s._id]}
                            onChange={e => handleStudentSelectChange(s._id, e.target.checked)}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700 }}>{s.rollNumber}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{s.name}</td>
                        <td style={{ padding: '10px 12px', color: '#64748B' }}>Semester {s.currentSemester}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>{(s.cgpa || 0.0).toFixed(2)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                            color: s.cgpaStatus === 'good_standing' || s.cgpa >= 2.5 ? '#047857' : s.cgpaStatus === 'warning' || s.cgpa >= 2.0 ? '#D97706' : '#B91C1C',
                            backgroundColor: s.cgpaStatus === 'good_standing' || s.cgpa >= 2.5 ? '#D1FAE5' : s.cgpaStatus === 'warning' || s.cgpa >= 2.0 ? '#FEF3C7' : '#FEE2E2'
                          }}>
                            {s.cgpaStatus || (s.cgpa >= 2.5 ? 'good_standing' : s.cgpa >= 2.0 ? 'warning' : 'critical')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {queryResults.length === 0 && !queryLoading && (
            <div style={{ padding: '40px', border: '1px dashed #CBD5E1', borderRadius: '16px', textAlign: 'center', backgroundColor: '#F8FAFC', color: '#94A3B8' }}>
              No custom queries executed yet. Configure parameters above and run search filters.
            </div>
          )}

        </div>
      )}

      {/* ── TAB 3: SAVED SNAPSHOTS LOG (FR-6.1 Snapshot Query Log History) ── */}
      {activeTab === 'snapshots' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {savedSnapshots.length === 0 ? (
            <div style={{ padding: '40px', border: '1px dashed #CBD5E1', borderRadius: '16px', textAlign: 'center', backgroundColor: '#F8FAFC', color: '#94A3B8' }}>
              Zero snapshots stored inside database registry cache. Run configurations to save summaries.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedSnapshots.map(snap => (
                <div key={snap.id} style={{
                  backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px',
                  padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)', position: 'relative'
                }}>
                  {/* Title & Delete */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#1B3A6B' }}>{snap.name}</h4>
                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>Saved At: {new Date(snap.createdAt).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteSnapshotClick(snap.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Filters Tag summary */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '10px 0' }}>
                    {Object.entries(snap.filters).map(([k, v]) => (
                      <span key={k} style={{
                        fontSize: '9.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
                        backgroundColor: '#F1F5F9', color: '#475569'
                      }}>
                        {k.toUpperCase()}: {v}
                      </span>
                    ))}
                  </div>

                  {/* Metrics Summary */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
                    <span>Result Counts: <b>{snap.dataSummary?.totalMatchingStudents || 0} students</b></span>
                    <span>Average CGPA: <b>{snap.dataSummary?.averageCgpa || '0.00'}</b></span>
                  </div>

                  {/* Load Snapshot triggers */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      onClick={() => handleLoadSnapshot(snap)}
                      style={{
                        padding: '5px 12px', border: 'none', borderRadius: '6px',
                        backgroundColor: '#EFF6FF', color: '#2563EB', fontSize: '11.5px',
                        fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      Load Configuration Filters
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
