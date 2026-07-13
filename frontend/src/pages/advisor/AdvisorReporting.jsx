import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart2, TrendingUp, Users, AlertTriangle, Download,
  RefreshCw, Filter, BookOpen, CheckCircle, Layers, FileText,
  PieChart as PieIcon, LineChart as LineIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

export default function AdvisorReporting() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [cgpaDist, setCgpaDist] = useState([]);
  const [studentsByBatch, setStudentsByBatch] = useState([]);
  const [atRiskTrend, setAtRiskTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBatch, setFilterBatch] = useState('all');
  const [selectedReportType, setSelectedReportType] = useState('performance');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, distRes, batchRes, trendRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/cgpa-distribution'),
        fetch('/api/dashboard/students-by-batch'),
        fetch('/api/dashboard/at-risk-trend')
      ]);
      if (statsRes.ok) {
        const d = await statsRes.json();
        const raw = d.data || {};
        setStats({
          students: raw.totalStudents ?? raw.students?.total ?? 0,
          atRisk: raw.atRiskStudents ?? 0,
          batches: raw.totalBatches ?? raw.batches?.total ?? 0,
          departments: raw.departments?.length ?? 0
        });
      }
      if (distRes.ok) {
        const d = await distRes.json();
        const raw = d.data || {};
        const labels = raw.labels || [];
        const counts = raw.counts || [];
        setCgpaDist(labels.map((label, i) => ({ label, count: counts[i] || 0 })));
      }
      if (batchRes.ok) {
        const d = await batchRes.json();
        setStudentsByBatch(d.data || []);
      }
      if (trendRes.ok) {
        const d = await trendRes.json();
        const raw = d.data || [];
        setAtRiskTrend(raw.map(p => ({
          label: p.month,
          count: (p.warning || 0) + (p.critical || 0)
        })).filter(p => p.count > 0));
      }
    } catch (e) {
      console.error('Reporting fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAtRiskStudentsList = async () => {
    let url = '/api/students?limit=200';
    if (user?.role === 'advisor') {
      url = '/api/advisor/students?limit=200';
    }
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        return (data.data.students || []).filter(s => s.cgpaStatus === 'warning' || s.cgpaStatus === 'critical');
      }
    } catch (e) {
      console.error('Failed to fetch at risk student list for CSV export:', e);
    }
    return [];
  };

  // Filtered batch data
  const batchOptions = studentsByBatch.map(b => b.batchCode).filter(Boolean);
  const filteredBatchData = filterBatch === 'all' ? studentsByBatch : studentsByBatch.filter(b => b.batchCode === filterBatch);

  // CGPA band labels
  const cgpaBands = [
    { label: 'Good Standing (≥2.5)', color: '#10B981', labelKey: 'good' },
    { label: 'Warning (2.0–2.49)', color: '#F59E0B', labelKey: 'warning' },
    { label: 'Critical (<2.0)', color: '#EF4444', labelKey: 'critical' }
  ];

  // Export report as CSV
  const exportCSV = async (reportTypeOverride) => {
    const activeReport = reportTypeOverride || selectedReportType;
    let rows = [];
    let filename = 'batchminder_report.csv';

    if (activeReport === 'performance' || activeReport === 'CGPA Distribution Report' || activeReport === 'Batch Performance Report') {
      filename = `academic_performance_report_${new Date().toISOString().split('T')[0]}.csv`;
      rows = [
        ['Report Name', 'Academic Performance & CGPA Distribution Report'],
        ['Role Scoped', user?.role?.toUpperCase() || 'N/A'],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['CGPA Standing Band', 'Student Count'],
        ...cgpaDist.map(d => [
          d.label === 'good' ? 'Good Standing (CGPA >= 2.50)' : d.label === 'warning' ? 'Warning Standing (2.00 <= CGPA < 2.50)' : 'Critical Standing (CGPA < 2.00)',
          d.count
        ])
      ];
    } else if (activeReport === 'enrollment' || activeReport === 'Enrollment Summary Report') {
      filename = `batch_enrollment_report_${new Date().toISOString().split('T')[0]}.csv`;
      rows = [
        ['Report Name', 'Batch Enrollment Summary Report'],
        ['Role Scoped', user?.role?.toUpperCase() || 'N/A'],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['Batch Code', 'Total Students', 'Active Students', 'At-Risk Students'],
        ...studentsByBatch.map(b => [b.batchCode, b.total, b.active, b.atRisk])
      ];
    } else if (activeReport === 'risk' || activeReport === 'At-Risk Students Report') {
      filename = `at_risk_monitoring_report_${new Date().toISOString().split('T')[0]}.csv`;
      const atRiskStudents = await fetchAtRiskStudentsList();
      rows = [
        ['Report Name', 'AI Academic Risk Registry'],
        ['Role Scoped', user?.role?.toUpperCase() || 'N/A'],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['Roll Number', 'Student Name', 'Email Address', 'Cumulative CGPA', 'Standing Status', 'Semester'],
        ...atRiskStudents.map(s => [s.rollNumber, s.name, s.email, s.cgpa.toFixed(2), s.cgpaStatus.toUpperCase(), s.currentSemester])
      ];
      if (atRiskStudents.length === 0) {
        rows.push(['No academically at-risk student records found.']);
      }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Academic Intelligence & Monitoring
          </p>
          <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            {titlePrefix} Reports & Analytics
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748B' }}>
            Generate, analyze, and export student performance summaries and risk assessments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchAll} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
            borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#fff',
            fontSize: '12px', fontWeight: 700, color: '#475569', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
          </button>
          <button onClick={() => exportCSV()} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
            borderRadius: '10px', border: 'none', backgroundColor: '#2563EB',
            fontSize: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)'
          }}>
            <Download size={14} /> Export Active Report
          </button>
        </div>
      </div>

      {/* Navigation tabs for Report Selection */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', gap: '24px', paddingBottom: '2px' }}>
        {[
          { id: 'performance', label: 'Academic Performance', icon: BarChart2 },
          { id: 'enrollment', label: 'Batch Enrollment', icon: Layers },
          { id: 'risk', label: 'Risk Assessment', icon: AlertTriangle }
        ].map(tab => {
          const TabIcon = tab.icon;
          const isSelected = selectedReportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedReportType(tab.id)}
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

      {/* Dynamic Content Views */}
      {selectedReportType === 'performance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Performance Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
            {/* CGPA Distribution Bar Chart */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                <BarChart2 size={16} color="#4F46E5" />
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>CGPA Metrics Summary</h3>
              </div>
              <div style={{ height: '280px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cgpaDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tickFormatter={(v) => v === 'good' ? 'Good Standing' : v === 'warning' ? 'Warning' : 'Critical'} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <RechartsTooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                    <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]}>
                      {cgpaDist.map((entry, idx) => {
                        const colors = { good: '#10B981', warning: '#F59E0B', critical: '#EF4444' };
                        return <Cell key={`cell-${idx}`} fill={colors[entry.label] || '#4F46E5'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CGPA Bands Breakdown Card */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                <PieIcon size={16} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>CGPA Standing Division</h3>
              </div>
              <div style={{ height: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cgpaDist}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4}
                      dataKey="count" nameKey="label"
                    >
                      {cgpaDist.map((entry, index) => {
                        const displayMap = { good: '#10B981', warning: '#F59E0B', critical: '#EF4444' };
                        return <Cell key={`cell-${index}`} fill={displayMap[entry.label] || '#94A3B8'} />;
                      })}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {cgpaBands.map((band, idx) => {
                  const val = cgpaDist.find(d => d.label === band.labelKey)?.count ?? 0;
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', justifyContent: 'space-between', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: band.color }} />
                        <span style={{ color: '#475569', fontWeight: 500 }}>{band.label}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>{val} ({stats?.students > 0 ? ((val / stats.students) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReportType === 'enrollment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Batches list & chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
            
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="#2563EB" />
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Batch Distribution</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={12} color="#94A3B8" />
                  <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={{
                    padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0',
                    fontSize: '11px', fontWeight: 700, color: '#1E293B', backgroundColor: '#F8FAFC', outline: 'none'
                  }}>
                    <option value="all">All Batches</option>
                    {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredBatchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="batchCode" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="total" name="Total Enrolled" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="active" name="Active Students" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="atRisk" name="At-Risk" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                <Layers size={16} color="#7C3AED" />
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Batch Allocations Summary</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {studentsByBatch.map((b, i) => (
                  <div key={i} style={{ border: '1px solid #F1F5F9', borderRadius: '10px', padding: '12px 14px', backgroundColor: '#FAFAFA' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1B3A6B' }}>{b.batchCode}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', backgroundColor: '#E2E8F0', padding: '2px 8px', borderRadius: '12px' }}>
                        {b.total} Students
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
                      <span>Active: <b>{b.active}</b></span>
                      <span style={{ color: b.atRisk > 0 ? '#EF4444' : '#10B981' }}>At-Risk: <b>{b.atRisk}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {selectedReportType === 'risk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
            {/* Risk Trend */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                <LineIcon size={16} color="#EF4444" />
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Risk Trend Analysis</h3>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                {atRiskTrend.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: '#94A3B8', fontSize: '12.5px' }}>
                    No significant risk trend data found.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={atRiskTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                      <Line type="monotone" dataKey="count" name="At-Risk Students" stroke="#EF4444" strokeWidth={3.5} dot={{ fill: '#EF4444', r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Alerts & Insights Panel */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                <AlertTriangle size={16} color="#F59E0B" />
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Risk Alerts & Insights</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stats?.atRisk > 0 ? (
                  <>
                    <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                      <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#991B1B' }}>Attention Needed</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#B91C1C', lineHeight: 1.4 }}>
                        There are <b>{stats.atRisk}</b> students classified with Warning or Critical standing. Review their profiles to avoid academic probation.
                      </p>
                    </div>

                    <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#92400E' }}>Credit-hour Rule Alert</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#B45309', lineHeight: 1.4 }}>
                        Students on academic warning (CGPA &le; 2.1) are cap-restricted to a maximum of 12 credits. Oversee approval requests carefully (BR-2).
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <CheckCircle size={32} color="#10B981" style={{ margin: '0 auto 10px' }} />
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#10B981' }}>All Clear</p>
                    <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#64748B' }}>No students currently fall under risk status bounds.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Quick Downloads and Specific Reports */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginTop: '8px' }}>
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#334155' }}>Need a detailed raw dataset?</h4>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>Download the complete academic statistics table in spreadsheet CSV format.</p>
          </div>
          <button onClick={() => exportCSV()} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
            borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#fff',
            fontSize: '11.5px', fontWeight: 700, color: '#475569', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            <Download size={13} /> Download Active Data
          </button>
        </div>

        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <FileText size={14} color="#64748B" />
            <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custom Reports Export</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'CGPA Distribution', type: 'performance' },
              { label: 'At-Risk Registry', type: 'risk' },
              { label: 'Enrollment Summary', type: 'enrollment' }
            ].map(item => (
              <button key={item.label} onClick={() => exportCSV(item.type)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: '8px',
                backgroundColor: '#fff', border: '1px solid #E2E8F0',
                fontSize: '11px', fontWeight: 700, color: '#334155', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s'
              }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
              >
                <span>{item.label}</span>
                <Download size={11} color="#94A3B8" />
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
