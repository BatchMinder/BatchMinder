import React, { useState, useEffect } from 'react';
import {
  BarChart2, TrendingUp, Users, AlertTriangle, Download,
  RefreshCw, Filter, BookOpen, CheckCircle, Layers, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';


export default function AdvisorReporting() {
  const [stats, setStats] = useState(null);
  const [cgpaDist, setCgpaDist] = useState([]);
  const [studentsByBatch, setStudentsByBatch] = useState([]);
  const [atRiskTrend, setAtRiskTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBatch, setFilterBatch] = useState('all');

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
        // API returns: data.totalStudents, data.atRiskStudents, data.totalBatches, data.departments[]
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
        // API returns: data.labels (array), data.counts (array of numbers)
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
        // API returns: [{month, warning, critical, total}]
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

  // Filtered batch data
  const batchOptions = studentsByBatch.map(b => b.batchCode).filter(Boolean);
  const filteredBatchData = filterBatch === 'all' ? studentsByBatch : studentsByBatch.filter(b => b.batchCode === filterBatch);

  // CGPA band labels
  const cgpaBands = [
    { label: '3.50 – 4.00', color: '#10B981' },
    { label: '2.50 – 3.49', color: '#3B82F6' },
    { label: '2.00 – 2.49', color: '#F59E0B' },
    { label: 'Below 2.00', color: '#EF4444' }
  ];

  // Export summary CSV
  const exportCSV = () => {
    const rows = [
      ['Section', 'Metric', 'Value'],
      ['Overview', 'Total Students', stats?.students || 0],
      ['Overview', 'Total Batches', stats?.batches || 0],
      ['Overview', 'At-Risk Students', stats?.atRisk || 0],
      ...studentsByBatch.map(b => ['Batch', b.batchCode, b.total]),
      ...cgpaDist.map((d, i) => ['CGPA Distribution', cgpaBands[i]?.label || `Band ${i + 1}`, d.count !== undefined ? d.count : 0])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'academic_report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const maxBatchStudents = Math.max(...filteredBatchData.map(b => b.total || 0), 1);
  const maxTrend = Math.max(...atRiskTrend.map(t => t.count || 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            6.2.12 — Reporting Dashboard
          </p>
          <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            Academic Reports & Analytics
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
            Real-time academic performance metrics, CGPA distribution, and enrollment trends
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchAll} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
            borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#fff',
            fontSize: '12px', fontWeight: 700, color: '#475569', cursor: 'pointer'
          }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={exportCSV} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
            borderRadius: '10px', border: 'none', backgroundColor: '#2563EB',
            fontSize: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer'
          }}>
            <Download size={14} /> Export Dashboard
          </button>
        </div>
      </div>

      {/* Academic Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {[
          { label: 'Total Students', value: stats?.students ?? '—', color: '#2563EB', bg: '#EFF6FF', icon: Users },
          { label: 'Active Batches', value: stats?.batches ?? '—', color: '#7C3AED', bg: '#F5F3FF', icon: Layers },
          { label: 'At-Risk Students', value: stats?.atRisk ?? '—', color: '#EF4444', bg: '#FEF2F2', icon: AlertTriangle },
          { label: 'Departments', value: stats?.departments ?? '—', color: '#16A34A', bg: '#F0FDF4', icon: BookOpen }
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
              <h3 style={{ margin: '4px 0 0', fontSize: '26px', fontWeight: 800, color: loading ? '#CBD5E1' : color, letterSpacing: '-0.5px' }}>
                {loading ? '...' : value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Panel + Enrollment Trends */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="#2563EB" />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Enrollment by Batch</h3>
          </div>
          {/* Academic Filter Panel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={13} color="#94A3B8" />
            <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} style={{
              padding: '5px 10px', borderRadius: '8px', border: '1px solid #E2E8F0',
              fontSize: '12px', fontWeight: 700, color: '#1E293B', outline: 'none',
              backgroundColor: '#F8FAFC', cursor: 'pointer', fontFamily: 'inherit'
            }}>
              <option value="all">All Batches</option>
              {batchOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '12px' }}>Loading...</div>
        ) : filteredBatchData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '12px' }}>No enrollment data available</div>
        ) : (
          <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredBatchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="batchCode" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <RechartsTooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="total" name="Total Students" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="active" name="Active Students" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="atRisk" name="At-Risk Students" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bottom Row: CGPA Distribution + At-Risk Trend + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>

        {/* CGPA Distribution Graph */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
            <BarChart2 size={15} color="#7C3AED" />
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>CGPA Distribution</h3>
          </div>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '12px', padding: '16px 0' }}>Loading...</p>
          ) : cgpaDist.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '12px', padding: '16px 0' }}>No distribution data</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cgpaDist.map((d, i) => {
                        const displayMap = {
                          good: { display: 'Good Standing (≥2.5)', color: '#10B981' },
                          warning: { display: 'Warning (2.0–2.49)', color: '#F59E0B' },
                          critical: { display: 'Critical (<2.0)', color: '#EF4444' }
                        };
                        const cfg = displayMap[d.label] || { display: d.label, color: '#94A3B8' };
                        return { name: cfg.display, value: d.count ?? 0, color: cfg.color };
                      })}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}
                      dataKey="value" stroke="none"
                    >
                      {cgpaDist.map((entry, index) => {
                        const displayMap = { good: '#10B981', warning: '#F59E0B', critical: '#EF4444' };
                        return <Cell key={`cell-${index}`} fill={displayMap[entry.label] || '#94A3B8'} />;
                      })}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '10px' }}>
                {cgpaDist.map((band, i) => {
                  const displayMap = { good: '#10B981', warning: '#F59E0B', critical: '#EF4444' };
                  const color = displayMap[band.label] || '#94A3B8';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
                      <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>{band.label.charAt(0).toUpperCase() + band.label.slice(1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* At-Risk Trend Chart */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
            <AlertTriangle size={15} color="#EF4444" />
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>At-Risk Trend</h3>
          </div>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '12px', padding: '16px 0' }}>Loading...</p>
          ) : atRiskTrend.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '12px', padding: '16px 0' }}>No trend data available</p>
          ) : (
            <div style={{ height: '240px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={atRiskTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                  <Line type="monotone" dataKey="count" name="At-Risk Students" stroke="#EF4444" strokeWidth={3} dot={{ fill: '#EF4444', r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Alerts & Insights + Quick Reports */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Alerts & Insights Section */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              <AlertTriangle size={15} color="#F59E0B" />
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Alerts & Insights</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? (
                <p style={{ color: '#94A3B8', fontSize: '12px' }}>Loading insights...</p>
              ) : [
                stats?.atRisk > 0 && {
                  type: 'warning',
                  msg: `${stats.atRisk} students currently at-risk — review immediately`,
                  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A'
                },
                cgpaDist.find((d, i) => i === 3 && (d.count ?? d) > 0) && {
                  type: 'critical',
                  msg: `${cgpaDist[3].count ?? cgpaDist[3]} students below CGPA 2.0 (FR-3.4)`,
                  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA'
                },
                studentsByBatch.length > 0 && {
                  type: 'info',
                  msg: `${studentsByBatch.length} active batches with enrollment data available`,
                  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE'
                }
              ].filter(Boolean).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <CheckCircle size={24} color="#16A34A" style={{ display: 'block', margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#16A34A' }}>No Active Alerts</p>
                </div>
              ) : [
                stats?.atRisk > 0 && { type: 'warning', msg: `${stats.atRisk} students currently at-risk`, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
                cgpaDist[3] && (cgpaDist[3].count ?? cgpaDist[3]) > 0 && { type: 'critical', msg: `${cgpaDist[3].count ?? cgpaDist[3]} students below CGPA 2.0`, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                { type: 'info', msg: `${stats?.students || 0} total students enrolled across ${stats?.batches || 0} batches`, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' }
              ].filter(Boolean).map((alert, i) => (
                <div key={i} style={{ padding: '9px 12px', borderRadius: '8px', backgroundColor: alert.bg, border: `1px solid ${alert.border}` }}>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: alert.color, lineHeight: 1.4 }}>{alert.msg}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Reports Panel */}
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <FileText size={14} color="#64748B" />
              <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Reports</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                'CGPA Distribution Report',
                'At-Risk Students Report',
                'Enrollment Summary Report',
                'Batch Performance Report'
              ].map(label => (
                <button key={label} onClick={exportCSV} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: '8px',
                  backgroundColor: '#fff', border: '1px solid #E2E8F0',
                  fontSize: '11px', fontWeight: 700, color: '#334155', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s'
                }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                >
                  {label}
                  <Download size={11} color="#94A3B8" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
