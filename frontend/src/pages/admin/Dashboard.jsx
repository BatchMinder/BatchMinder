import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, BookOpen, Layers, CheckSquare, Calendar, UploadCloud, AlertTriangle, Info, CheckCircle2, XCircle, Plus, FileSpreadsheet, Settings, FileText, CalendarDays, RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';
const COLORS = {
  active: '#2563EB',
  atRisk: '#10B981',
  graduated: '#F59E0B',
  inactive: '#8B5CF6'
};

const CGPA_COLORS = {
  good: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444'
};

export default function Dashboard({ departments, selectedDept, setActiveNav }) {
  const [stats, setStats] = useState(null);
  const [cgpaDist, setCgpaDist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadPage, setUploadPage] = useState(1);
  const { user } = useAuth();
  const isDeanOrHOD = user?.role === 'dean' || user?.role === 'admin' || user?.role === 'academic_admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, cgpaRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/cgpa-distribution'),
      ]);
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.data);
      }
      if (cgpaRes.ok) {
        const d = await cgpaRes.json();
        setCgpaDist(d.data);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedDept]);

  if (loading || !stats) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Loading dashboard...</div>;
  }

  // Derived metrics for UI
  const {
    totalStudents = 0,
    activeStudents = 0,
    atRiskStudents = 0,
    studentsByStatus = { good: 0, warning: 0, critical: 0 },
    batches = { allocated: 0, total: 0 },
    pendingMigrations = 0,
    totalCourses = 0,
    scheduledClasses = 0,
    departments: deptStats = [],
    recentUploads = [],
    activityLogs = []
  } = stats;

  const statCards = [
    { label: 'Total Students', value: totalStudents, subtitle: 'Total enrolled', icon: Users, color: '#2563EB', bg: '#EFF6FF', nav: 'students' },
    { label: 'Total Courses', value: totalCourses, subtitle: 'In active curriculums', icon: BookOpen, color: '#10B981', bg: '#F0FDF4', nav: 'curriculum' },
    { label: 'Active Batches', value: batches.allocated, subtitle: `Out of ${batches.total} total`, icon: Layers, color: '#F59E0B', bg: '#FFFBEB', nav: 'batches' },
    { label: 'Pending Approvals', value: pendingMigrations, subtitle: 'Require attention', icon: CheckSquare, color: '#EF4444', bg: '#FEF2F2', nav: 'migrations' },
    { label: 'Scheduled Classes', value: scheduledClasses, subtitle: 'Timetable slots', icon: Calendar, color: '#8B5CF6', bg: '#F5F3FF', nav: 'timetable_generator' },
  ];

  // Overview Donut Data
  const overviewData = [
    { name: 'Active Students', value: activeStudents, color: COLORS.active },
    { name: 'At-Risk Students', value: atRiskStudents, color: COLORS.atRisk },
    { name: 'Graduated Students', value: 0, color: COLORS.graduated },
    { name: 'Inactive Students', value: totalStudents - activeStudents - atRiskStudents, color: COLORS.inactive },
  ].filter(d => d.value > 0);

  // CGPA Distribution Bar Data
  const cgpaBarData = cgpaDist && cgpaDist.labels ? cgpaDist.labels.map((label, idx) => ({
    range: label.toUpperCase(),
    value: cgpaDist.counts[idx],
    fill: CGPA_COLORS[label] || '#CBD5E1'
  })) : [];

  const handleUploadClick = () => {
    setActiveNav('upload');
  };

  const handleDownloadTemplate = (e) => {
    e.preventDefault();
    const headers = ['rollNumber', 'name', 'email', 'department', 'batch', 'semester', 'cgpa'];
    const rows = [
      ['BSCS-23S-1001', 'Ahmed Raza', 'ahmed.raza@stmu.edu.pk', 'Computer Science', 'BSCS-2023', '3', '3.45'],
      ['BSCS-23S-1002', 'Sara Malik', 'sara.malik@stmu.edu.pk', 'Computer Science', 'BSCS-2023', '3', '1.87'],
      ['BSCS-23S-1003', 'Usman Tariq', 'usman.tariq@stmu.edu.pk', 'Computer Science', 'BSCS-2023', '3', '2.08']
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_upload_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '0 0 40px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* 1. TOP STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              onClick={() => setActiveNav && card.nav && setActiveNav(card.nav)}
              style={{
                backgroundColor: '#fff', borderRadius: '16px', padding: '20px',
                border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={card.color} />
                </div>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#64748B' }}>{card.label}</p>
              <h3 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{card.value.toLocaleString()}</h3>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#94A3B8' }}>{card.subtitle}</p>
            </button>
          );
        })}
      </div>


      {/* 2. UPLOADS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 mb-6">

        {/* Upload Zone */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A', alignSelf: 'flex-start' }}>Upload Student Data</h3>
          <UploadCloud size={44} color="#3B82F6" style={{ marginBottom: '14px' }} />
          <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Upload CSV or Excel file to add or update student records</p>
          <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#94A3B8' }}>Supported formats: .csv, .xlsx</p>
          <button
            onClick={handleUploadClick}
            style={{
              width: '100%', padding: '10px 16px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
              transition: 'all 0.15s ease', marginBottom: '10px'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.2)'; }}
          >
            <UploadCloud size={16} /> Choose File to Upload
          </button>
          <button
            onClick={handleDownloadTemplate}
            style={{
              width: '100%', padding: '8px 14px',
              backgroundColor: '#F8FAFC', color: '#2563EB',
              border: '1px solid #E2E8F0', borderRadius: '8px',
              fontSize: '12px', fontWeight: 600, display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '6px',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <FileSpreadsheet size={14} /> Download Sample Template
          </button>
        </div>

        {/* Recent Uploads Table */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Recent Uploads</h3>
            <button
              onClick={handleUploadClick}
              style={{
                fontSize: '12px', color: '#2563EB', border: '1px solid #DBEAFE',
                backgroundColor: '#EFF6FF', padding: '4px 12px', borderRadius: '6px',
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2563EB'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; }}
            >
              View All
            </button>
          </div>
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600, textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px' }}>FILE NAME</th>
                  <th style={{ padding: '12px 8px' }}>UPLOADED BY</th>
                  <th style={{ padding: '12px 8px' }}>RECORDS</th>
                  <th style={{ padding: '12px 8px' }}>STATUS</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const itemsPerPage = 5;
                  const paginatedUploads = recentUploads.slice((uploadPage - 1) * itemsPerPage, uploadPage * itemsPerPage);
                  return paginatedUploads.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No recent uploads</td></tr>
                  ) : (
                    paginatedUploads.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 8px', color: '#0F172A', fontWeight: 500 }}>{u.fileName}</td>
                        <td style={{ padding: '12px 8px', color: '#64748B' }}>{u.uploadedBy}</td>
                        <td style={{ padding: '12px 8px', color: '#64748B' }}>{u.records}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: u.status === 'complete' ? '#D1FAE5' : (u.status === 'failed' ? '#FEE2E2' : '#FEF3C7'), color: u.status === 'complete' ? '#059669' : (u.status === 'failed' ? '#DC2626' : '#D97706') }}>
                            {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#64748B', textAlign: 'right' }}>{format(new Date(u.date), 'MMM d, h:mm a')}</td>
                      </tr>
                    ))
                  );
                })()}
              </tbody>
            </table>
          </div>
          {(() => {
            const itemsPerPage = 5;
            const totalUploadPages = Math.ceil(recentUploads.length / itemsPerPage);
            return totalUploadPages > 1 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                <button
                  disabled={uploadPage === 1}
                  onClick={() => setUploadPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                    borderRadius: '8px', border: '1px solid #E2E8F0',
                    backgroundColor: uploadPage === 1 ? '#F8FAFC' : '#fff',
                    color: uploadPage === 1 ? '#CBD5E1' : '#334155',
                    cursor: uploadPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                  Page {uploadPage} of {totalUploadPages}
                </span>
                <button
                  disabled={uploadPage === totalUploadPages}
                  onClick={() => setUploadPage(p => Math.min(totalUploadPages, p + 1))}
                  style={{
                    padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                    borderRadius: '8px', border: '1px solid #E2E8F0',
                    backgroundColor: uploadPage === totalUploadPages ? '#F8FAFC' : '#fff',
                    color: uploadPage === totalUploadPages ? '#CBD5E1' : '#334155',
                    cursor: uploadPage === totalUploadPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Next
                </button>
              </div>
            ) : null;
          })()}
        </div>

      </div>



      {/* 3. CHARTS & DEPARTMENTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

        {/* Students Overview */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Students Overview</h3>
          {overviewData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '160px', height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={overviewData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                      {overviewData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {overviewData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.color }}></div>
                      <span style={{ color: '#475569', fontWeight: 500 }}>{d.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A', display: 'block' }}>{d.value.toLocaleString()}</span>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>{Math.round((d.value / totalStudents) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 13 }}>No data</div>
          )}
        </div>

        {/* CGPA Distribution */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>CGPA Distribution</h3>
          {cgpaBarData.length > 0 ? (
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cgpaBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {cgpaBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 13 }}>No data</div>
          )}
        </div>

        {/* Department Summary */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Department Summary</h3>
            <button
              onClick={() => setActiveNav('students')}
              style={{ fontSize: '13px', color: '#2563EB', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              View All
            </button>
          </div>
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600, textAlign: 'left' }}>
                  <th style={{ padding: '8px 0' }}>DEPARTMENT</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>STUDENTS</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {deptStats.length === 0 ? (
                  <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No departments</td></tr>
                ) : (
                  deptStats.map(d => (
                    <tr key={d.code} style={{ borderBottom: '1px solid #F8FAFC' }}>
                      <td style={{ padding: '10px 0', color: '#0F172A', fontWeight: 500 }}>{d.name}</td>
                      <td style={{ padding: '10px 0', color: '#64748B', textAlign: 'right' }}>{d.students}</td>
                      <td style={{ padding: '10px 0', color: '#64748B', textAlign: 'right' }}>{d.pct}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 4. QUICK ACTIONS ROW */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>Quick Actions</h3>
        <div className="thin-scrollbar" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { label: 'Student Records', icon: Users, id: 'students', iconColor: '#16A34A', bg: '#F0FDF4' },
            { label: 'CSV/Excel Ingestion', icon: UploadCloud, id: 'upload', iconColor: '#2563EB', bg: '#EFF6FF' },
            { label: 'Batch Allocation', icon: Layers, id: 'batches', iconColor: '#8B5CF6', bg: '#F5F3FF' },
            { label: 'Migration Records', icon: RefreshCw, id: 'migrations', iconColor: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Curriculum Setup', icon: BookOpen, id: 'curriculum', iconColor: '#EC4899', bg: '#FDF2F8' },
            { label: 'Timetable Setup', icon: Calendar, id: 'timetable_generator', iconColor: '#0D9488', bg: '#F0FDFA' },
            { label: 'Exam Schedule', icon: CalendarDays, id: 'datesheet_generator', iconColor: '#E11D48', bg: '#FFF1F2' },
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={() => setActiveNav && action.id && setActiveNav(action.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '14px 8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                  borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'center',
                  minWidth: '130px', flexShrink: 0
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={action.iconColor} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>


    </div>
  );
}
