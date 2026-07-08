import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Eye, X, User, Award, Mail, BookOpen, AlertCircle,
  Download, UserPlus, ChevronLeft, ChevronRight, TrendingUp,
  CheckCircle, AlertTriangle, FileText, Bell
} from 'lucide-react';
import { CircularProgress } from '@mui/material';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';

export default function StudentRecords() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ rollNumber: '', name: '', email: '', departmentId: '', batchId: '', cgpa: '' });
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 0, activeStudents: 0, atRiskStudents: 0, graduatedStudents: 0 });
  const limit = 6; // Compact list to fit beautifully next to activities


  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/students?${params}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data.data.students);
        setTotal(data.total);
      } else {
        setError(data.message || 'Failed to fetch');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, search, statusFilter]);

  const fetchStats = async () => {
    try {
      const r = await fetch('/api/dashboard/stats');
      const d = await r.json();
      if (d.status === 'success' && d.data) setStats(d.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetch('/api/batches').then(r => r.json()).then(d => { if (d.status === 'success') setBatches(d.data); }).catch(() => {});
    fetch('/api/departments').then(r => r.json()).then(d => { if (d.status === 'success') setDepartments(d.data); }).catch(() => {});
    fetchStats();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setFormData({ rollNumber: '', name: '', email: '', departmentId: '', batchId: '', cgpa: '' });
        setPage(1);
        fetchStudents();
        fetchStats();
      } else {
        alert(data.message || 'Failed to create student');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setDeptFilter('');
    setPage(1);
  };

  // Filter actual DB students
  const displayStudents = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const matchesSearch = !search || s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || s.status === statusFilter;
      const deptName = s.departmentId?.name || '';
      const matchesDept = !deptFilter || deptName.toLowerCase().includes(deptFilter.toLowerCase());
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [students, search, statusFilter, deptFilter]);

  const getCgpaColor = (cgpa) => {
    if (cgpa >= 3.5) return '#2563EB'; // Blue
    if (cgpa >= 3.0) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  // Recharts Data Definitions
  const cgpaData = [
    { name: '3.5 - 4.0', value: 45, color: '#2563EB' },
    { name: '3.0 - 3.5', value: 25, color: '#10B981' },
    { name: '2.5 - 3.0', value: 20, color: '#F59E0B' },
    { name: 'Under 2.5', value: 10, color: '#EF4444' },
  ];

  const atRiskTrendData = [
    { name: 'JAN', value: 150 },
    { name: 'MAR', value: 220 },
    { name: 'MAY', value: 180 },
    { name: 'JUL', value: 290 },
    { name: 'SEP', value: 260 },
    { name: 'NOV', value: 340 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── Breadcrumbs & Title Row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94A3B8', fontWeight: 500, marginBottom: '6px' }}>
            <span>BatchMinder</span>
            <span>&rsaquo;</span>
            <span>Student Records</span>
            <span>&rsaquo;</span>
            <span style={{ color: '#2563EB', fontWeight: 600 }}>All Students</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            Student Record Management
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
            Managing 2,847 academic files across 12 departments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px',
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px',
              fontWeight: 600, fontSize: '13px', color: '#475569', cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            <Download size={15} /> Export Records
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px',
              backgroundColor: '#2563EB', border: 'none', borderRadius: '10px',
              fontWeight: 600, fontSize: '13px', color: '#FFFFFF', cursor: 'pointer',
              transition: 'background 0.15s', boxShadow: '0 4px 10px rgba(37,99,235,0.15)'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1D4ED8'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563EB'}
          >
            <UserPlus size={15} /> Enrol Student
          </button>
        </div>
      </div>

      {/* ── Metric Cards Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        
        {/* Total Students Card */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Students</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: '12px' }}>Live</span>
          </div>
          <h3 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>{stats.totalStudents}</h3>
        </div>

        {/* Active Students Card */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Students</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '12px' }}>Active</span>
          </div>
          <h3 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>{stats.activeStudents}</h3>
        </div>

        {/* At-Risk Students Card */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>At-Risk Students</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', backgroundColor: '#FEE2E2', padding: '3px 8px', borderRadius: '12px' }}>Alert</span>
          </div>
          <h3 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>{stats.atRiskStudents}</h3>
        </div>

        {/* Graduated Card */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Graduated</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Alumni</span>
          </div>
          <h3 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>{stats.graduatedStudents}</h3>
        </div>
      </div>

      {/* ── Two Column Main Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'stretch' }}>
        
        {/* Left Column: Filters and Table Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Filters Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
              {/* Search Field */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  placeholder="Search by name or ID..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', outline: 'none', backgroundColor: '#F8FAFC', fontFamily: 'inherit' }}
                />
              </div>

              {/* Department Dropdown */}
              <select
                value={deptFilter}
                onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
                style={{ padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', backgroundColor: '#FFFFFF', color: '#475569', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                <option value="">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Data Science">Data Science</option>
                <option value="Applied Math">Applied Math</option>
              </select>

              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', backgroundColor: '#FFFFFF', color: '#475569', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <button
              onClick={handleClearFilters}
              style={{ border: 'none', backgroundColor: 'transparent', color: '#2563EB', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Clear Filters
            </button>
          </div>

          {/* Student Directory Table Card */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student ID</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading && displayStudents.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}><CircularProgress size={16} style={{ marginRight: 8 }} /> Loading students...</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>{error}</td></tr>
                ) : displayStudents.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No students found</td></tr>
                ) : displayStudents.map((s, idx) => {
                  const initials = s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const avatarColor = ['#3B82F6', '#10B981', '#6366F1', '#8B5CF6', '#EC4899'][idx % 5];
                  return (
                    <tr key={s._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                      {/* Student ID */}
                      <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontWeight: 600, color: '#475569', fontSize: '12px' }}>
                        {s.rollNumber}
                      </td>

                      {/* User Profile (Avatar + Name + Email) */}
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            backgroundColor: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '11px', color: '#FFFFFF', flexShrink: 0
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0F172A' }}>{s.name}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{s.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td style={{ padding: '12px 20px', color: '#475569', fontWeight: 500 }}>
                        {s.departmentId?.name || 'Computer Science'}
                      </td>

                      {/* Semester */}
                      <td style={{ padding: '12px 20px', color: '#64748B' }}>
                        Semester {s.currentSemester}
                      </td>

                      {/* CGPA Progress Bar + Value */}
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '130px' }}>
                          <div style={{ flex: 1, height: '5px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${(s.cgpa / 4.0) * 100}%`, height: '100%', backgroundColor: getCgpaColor(s.cgpa), borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', minWidth: '28px' }}>
                            {s.cgpa.toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* View Action */}
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelected(s)}
                          style={{ padding: '6px', border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#1E293B'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #E2E8F0', backgroundColor: '#FAFAFA', fontSize: '12px' }}>
              <span style={{ color: '#94A3B8', fontWeight: 500 }}>
                Showing {displayStudents.length === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} records
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{
                    padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF', color: '#64748B', cursor: page > 1 ? 'pointer' : 'not-allowed',
                    opacity: page > 1 ? 1 : 0.5, display: 'flex', alignItems: 'center'
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                
                {Array.from({ length: Math.ceil(total / limit) || 1 }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === Math.ceil(total / limit) || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: '#94A3B8' }}>...</span>}
                      <button
                        onClick={() => setPage(p)}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', backgroundColor: page === p ? '#2563EB' : 'transparent', color: page === p ? '#FFFFFF' : '#64748B', fontWeight: page === p ? 700 : 600, fontSize: '11px', cursor: 'pointer' }}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))
                }

                <button
                  disabled={page >= Math.ceil(total / limit)}
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF', color: '#64748B', cursor: page < Math.ceil(total / limit) ? 'pointer' : 'not-allowed',
                    opacity: page < Math.ceil(total / limit) ? 1 : 0.5, display: 'flex', alignItems: 'center'
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Activities Panel & System Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Activities Card */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Recent Activities</h3>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}>View All</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Activity 1 */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#2563EB' }}>
                  <UserPlus size={12} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', lineHeight: 1.2 }}>New student record added</span>
                  <span style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.2 }}>Liam Carter (CS-2024-0012) was enrolled in Batch 2024A.</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', marginTop: '2px', textTransform: 'uppercase' }}>2 MINS AGO</span>
                </div>
              </div>

              {/* Activity 2 */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#16A34A' }}>
                  <CheckCircle size={12} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', lineHeight: 1.2 }}>CGPA updated</span>
                  <span style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.2 }}>Sana Al-Farsi's grade sheet processed for Semester 5.</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', marginTop: '2px', textTransform: 'uppercase' }}>45 MINS AGO</span>
                </div>
              </div>

              {/* Activity 3 */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#EF4444' }}>
                  <AlertTriangle size={12} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', lineHeight: 1.2 }}>Status Change: At Risk</span>
                  <span style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.2 }}>System flagged 12 students in Batch 2023C due to attendance.</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', marginTop: '2px', textTransform: 'uppercase' }}>2 HOURS AGO</span>
                </div>
              </div>

              {/* Activity 4 */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#2563EB' }}>
                  <FileText size={12} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', lineHeight: 1.2 }}>Batch Report Exported</span>
                  <span style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.2 }}>End of Semester performance summary generated by Admin.</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', marginTop: '2px', textTransform: 'uppercase' }}>5 HOURS AGO</span>
                </div>
              </div>

              {/* Activity 5 */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#2563EB' }}>
                  <Bell size={12} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', lineHeight: 1.2 }}>Notice Issued</span>
                  <span style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.2 }}>Probation alerts sent to 4 students in Applied Math.</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', marginTop: '2px', textTransform: 'uppercase' }}>YESTERDAY</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Status Panel */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
              SYSTEM STATUS
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E3A8A', backgroundColor: '#EFF6FF', padding: '4px 10px', borderRadius: '8px' }}>
              Database Sync 99.8%
            </span>
          </div>

        </div>

      </div>

      {/* ── Bottom Section: Charts Panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px 320px', gap: '16px' }}>
        
        {/* Chart 1: CGPA Distribution Doughnut Chart */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>CGPA Distribution</h3>
            <AlertCircle size={14} color="#94A3B8" />
          </div>
          
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: '20px', minHeight: '140px' }}>
            {/* Doughnut Chart Canvas */}
            <div style={{ position: 'relative', width: '130px', height: '130px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cgpaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {cgpaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>3.4</span>
                <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600, marginTop: '2px' }}>Avg GPA</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
              {cgpaData.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color }} />
                    <span style={{ color: '#475569', fontWeight: 500 }}>{c.name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Students by Department Horizontal Bars */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            Students by Department
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', flex: 1 }}>
            {/* Department 1 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>CS</span>
                <span style={{ fontWeight: 700, color: '#1F2937' }}>842</span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '85%', height: '100%', backgroundColor: '#2563EB', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Department 2 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>DS</span>
                <span style={{ fontWeight: 700, color: '#1F2937' }}>654</span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '65%', height: '100%', backgroundColor: '#2563EB', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Department 3 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>AM</span>
                <span style={{ fontWeight: 700, color: '#1F2937' }}>421</span>
              </div>
              <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '45%', height: '100%', backgroundColor: '#2563EB', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: At-Risk Students Trend Vertical Bars */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
            At-Risk Students Trend
          </h3>
          <div style={{ width: '100%', height: '110px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={atRiskTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                <Bar dataKey="value" fill="#FCA5A5" radius={[4, 4, 0, 0]}>
                  {atRiskTrendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 5 ? '#B91C1C' : '#FCA5A5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1B3A6B', display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={18} /> Student Details
              </h3>
              <button onClick={() => setSelected(null)} style={{ padding: 4, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X size={20} /></button>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#2563EB' }}>
                {selected.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0F172A' }}>{selected.name}</div>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748B' }}>{selected.rollNumber}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</div>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{selected.departmentId?.name || 'Computer Science'}</div>
              </div>
              <div style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA</div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={14} color="#F59E0B" /> {selected.cgpa.toFixed(2)}
                </div>
              </div>
              <div style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester</div>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{selected.currentSemester}</div>
              </div>
              <div style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 4, textTransform: 'capitalize' }}>{selected.status}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Student Form Modal ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1B3A6B' }}>Add New Student</h3>
              <button onClick={() => setShowForm(false)} style={{ padding: 4, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Roll Number *</label>
                  <input required value={formData.rollNumber} onChange={e => setFormData(f => ({ ...f, rollNumber: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Name *</label>
                  <input required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Department *</label>
                    <select required value={formData.departmentId} onChange={e => setFormData(f => ({ ...f, departmentId: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, backgroundColor: '#fff', outline: 'none', fontFamily: 'inherit' }}>
                      <option value="">Select...</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Batch *</label>
                    <select required value={formData.batchId} onChange={e => setFormData(f => ({ ...f, batchId: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, backgroundColor: '#fff', outline: 'none', fontFamily: 'inherit' }}>
                      <option value="">Select...</option>
                      {batches.map(b => <option key={b._id} value={b._id}>{b.code}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>CGPA</label>
                  <input type="number" step="0.01" min="0" max="4" value={formData.cgpa} onChange={e => setFormData(f => ({ ...f, cgpa: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: '8px 20px', borderRadius: 10, border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ padding: '8px 20px', borderRadius: 10, border: 'none', backgroundColor: '#2563EB', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
