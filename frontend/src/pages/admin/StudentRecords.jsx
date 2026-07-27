import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Eye, X, User, Award, AlertCircle,
  Download, UserPlus, ChevronLeft, ChevronRight,
  FileText, Edit3, Trash2, RefreshCw
} from 'lucide-react';
import CircularProgress from '@mui/material/CircularProgress';




import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import AcademicSummary from '../../pages/students/AcademicSummary';
import DegreeProgress from '../../pages/students/DegreeProgress';
import ResponsiveSelect from '../../components/common/ResponsiveSelect';

export default function StudentRecords({ setActiveNav }) {
  const { user } = useAuth();
  const { showConfirm, showAlert, showSuccess } = useModal();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('profile');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ rollNumber: '', name: '', email: '', phone: '', departmentId: '', batchId: '', currentSemester: 1, cgpa: '', intakeSession: 'Fall' });
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 0, activeStudents: 0, atRiskStudents: 0, graduatedStudents: 0 });
  const [cgpaDist, setCgpaDist] = useState(null);
  const [atRiskTrend, setAtRiskTrend] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const limit = 6; // Compact list to fit beautifully next to activities

  // Helper to generate auto-incremented roll number based on selected department, batch & intake session
  const generateNextRollNumber = (deptId, bId, session = 'Fall') => {
    const selectedDept = departments.find(d => d._id === deptId || d.name === deptId);
    const selectedBatch = batches.find(b => b._id === bId || b.code === bId);

    const deptCode = selectedDept?.code || (departments[0]?.code) || 'BSCS';
    const termLetter = session === 'Spring' ? 'S' : 'F';
    let yrCode = `24${termLetter}`;

    const batchCode = selectedBatch?.code || (batches[0]?.code);
    if (batchCode) {
      if (batchCode.includes('-')) {
        const parts = batchCode.split('-');
        const yr = parts[1] ? parts[1].replace(/^20/, '') : '24';
        yrCode = `${yr}${termLetter}`;
      } else {
        yrCode = `${batchCode.replace(/^20/, '')}${termLetter}`;
      }
    }

    const prefix = `${deptCode}-${yrCode}-`;
    let maxNum = 0;

    (students || []).forEach(s => {
      if (s.rollNumber && s.rollNumber.startsWith(prefix)) {
        const parts = s.rollNumber.split('-');
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextSeq = String(maxNum + 1).padStart(4, '0');
    return `${prefix}${nextSeq}`;
  };

  const handleOpenAddModal = () => {
    const defaultDept = departments[0]?._id || '';
    const defaultBatch = batches[0]?._id || '';
    const defaultSession = 'Fall';
    const autoRoll = generateNextRollNumber(defaultDept, defaultBatch, defaultSession);
    setFormData({
      rollNumber: autoRoll,
      name: '',
      email: '',
      phone: '',
      departmentId: defaultDept,
      batchId: defaultBatch,
      currentSemester: 1,
      cgpa: '',
      intakeSession: defaultSession
    });
    setShowForm(true);
  };

  // Edit / Delete Student States
  const [editingStudent, setEditingStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ rollNumber: '', name: '', email: '', phone: '', departmentId: '', batchId: '', currentSemester: 1, cgpa: '', status: 'active', intakeSession: 'Fall' });

  const handleEditClick = (s) => {
    setEditingStudent(s);
    setEditForm({
      rollNumber: s.rollNumber,
      name: s.name,
      email: s.email || '',
      phone: s.phone || '',
      departmentId: s.departmentId?._id || s.departmentId || '',
      batchId: s.batchId?._id || s.batchId || '',
      cgpa: s.cgpa || '',
      status: s.status || 'active',
      intakeSession: s.intakeSession || (/-[0-9]{2}[Ss]-/.test(s.rollNumber) ? 'Spring' : 'Fall')
    });
    setShowEditModal(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${editingStudent._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        setShowEditModal(false);
        setEditingStudent(null);
        showSuccess('Student record updated successfully.');
        fetchStudents();
        fetchStats();
      } else {
        alert(data.message || 'Failed to update student');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = async (studentId) => {
    const confirmed = await showConfirm(
      'Delete Student Record',
      'Are you sure you want to delete this student record? This action cannot be undone.',
      'Delete',
      'Cancel',
      '#EF4444'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showSuccess('Student record deleted successfully.');
        fetchStudents();
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete student');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete student');
    }
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (sessionFilter) params.append('intakeSession', sessionFilter);
      if (deptFilter) params.append('department', deptFilter);
      if (batchFilter) params.append('batch', batchFilter);
      if (semesterFilter) params.append('semester', semesterFilter);

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
  }, [page, search, statusFilter, sessionFilter, deptFilter, batchFilter, semesterFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (selected) {
      setDetailTab('profile');
    }
  }, [selected]);

  const fetchStats = async () => {
    try {
      const r = await fetch('/api/dashboard/stats');
      const d = await r.json();
      if (d.status === 'success' && d.data) setStats(d.data);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs?limit=5');
      if (res.ok) {
        const d = await res.json();
        setAuditLogs(d.data?.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetch('/api/batches').then(r => r.json()).then(d => { if (d.status === 'success') setBatches(d.data); }).catch(() => { });
    fetch('/api/departments').then(r => r.json()).then(d => { if (d.status === 'success') setDepartments(d.data); }).catch(() => { });
    fetch('/api/dashboard/cgpa-distribution').then(r => r.json()).then(d => { if (d.status === 'success') setCgpaDist(d.data); }).catch(() => { });
    fetch('/api/dashboard/at-risk-trend').then(r => r.json()).then(d => {
      if (d.status === 'success' && d.data) {
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        setAtRiskTrend(d.data.map(item => {
          const [, monthNum] = item.month.split('-');
          const monthIndex = parseInt(monthNum) - 1;
          return {
            name: months[monthIndex] || item.month,
            value: item.warning + item.critical
          };
        }));
      }
    }).catch(() => { });
    fetchStats();
    fetchAuditLogs();
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
        setFormData({ rollNumber: '', name: '', email: '', phone: '', departmentId: '', batchId: '', cgpa: '' });
        setPage(1);
        showSuccess('Student record created successfully.');
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
    setSessionFilter('');
    setDeptFilter('');
    setBatchFilter('');
    setSemesterFilter('');
    setPage(1);
  };

  const handleExport = () => {
    const listToExport = displayStudents.length > 0 ? displayStudents : students;
    if (!listToExport || listToExport.length === 0) {
      showAlert('Notice', 'No student records available to export.');
      return;
    }

    const headers = ['Student ID', 'Name', 'Email', 'Department', 'Semester', 'CGPA', 'Status'];
    const rows = listToExport.map(s => [
      s.rollNumber,
      s.name,
      s.email || '',
      s.departmentId?.name || 'Computer Science',
      s.currentSemester || '1',
      s.cgpa ? s.cgpa.toFixed(2) : '0.00',
      s.status || 'active'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const cell = val === null || val === undefined ? '' : String(val);
        return cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Student_Records_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('Student records exported successfully!');
  };

  // Filter actual DB students
  const displayStudents = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const matchesSearch = !search || (s.name || '').toLowerCase().includes(q) || (s.rollNumber || '').toLowerCase().includes(q);
      const matchesStatus = !statusFilter || s.status === statusFilter;
      const deptName = s.departmentId?.name || '';
      const matchesDept = !deptFilter || deptName.toLowerCase().includes(deptFilter.toLowerCase());

      const batchCode = s.batchId?.code || '';
      const matchesBatch = !batchFilter || batchCode.toLowerCase().includes(batchFilter.toLowerCase());

      const sem = s.currentSemester || 1;
      const matchesSemester = !semesterFilter || 
        (semesterFilter === 'graduated' ? s.status === 'graduated' : (sem === Number(semesterFilter) && s.status !== 'graduated'));

      return matchesSearch && matchesStatus && matchesDept && matchesBatch && matchesSemester;
    });
  }, [students, search, statusFilter, deptFilter, batchFilter, semesterFilter]);

  const getCgpaColor = (cgpa) => {
    if (cgpa >= 3.0) return '#10B981'; // Green (Good Standing)
    if (cgpa >= 2.0) return '#EAB308'; // Yellow (Academic Warning)
    return '#EF4444'; // Red (Critical Risk)
  };

  const avgGpa = useMemo(() => {
    if (!students || students.length === 0) return '0.00';
    const validStudents = students.filter(s => s.cgpa);
    if (validStudents.length === 0) return '0.00';
    const sum = validStudents.reduce((acc, s) => acc + parseFloat(s.cgpa || 0), 0);
    return (sum / validStudents.length).toFixed(2);
  }, [students]);

  // Dynamic Recharts Data Definitions
  const cgpaData = useMemo(() => {
    if (!cgpaDist || !cgpaDist.labels) {
      return [
        { name: 'Good Standing', value: 0, color: '#10B981' },
        { name: 'Warning', value: 0, color: '#EAB308' },
        { name: 'Critical Risk', value: 0, color: '#EF4444' }
      ];
    }
    const totalDist = cgpaDist.counts.reduce((a, b) => a + b, 0) || 1;
    return [
      { name: 'Good Standing', value: Math.round((cgpaDist.counts[0] / totalDist) * 100), color: '#10B981' },
      { name: 'Academic Warning', value: Math.round((cgpaDist.counts[1] / totalDist) * 100), color: '#EAB308' },
      { name: 'Critical Risk', value: Math.round((cgpaDist.counts[2] / totalDist) * 100), color: '#EF4444' }
    ].filter(item => item.value > 0);
  }, [cgpaDist]);

  const atRiskTrendData = useMemo(() => {
    if (atRiskTrend.length > 0) return atRiskTrend;
    return [
      { name: 'JAN', value: 0 },
      { name: 'MAR', value: 0 },
      { name: 'MAY', value: 0 },
      { name: 'JUL', value: 0 },
      { name: 'SEP', value: 0 },
      { name: 'NOV', value: 0 }
    ];
  }, [atRiskTrend]);

  const departmentStats = useMemo(() => {
    if (!stats || !stats.departments) return [];
    const maxCount = Math.max(...stats.departments.map(d => d.students), 1);
    return stats.departments.map(d => ({
      code: d.code || d.name,
      students: d.students,
      widthPct: Math.round((d.students / maxCount) * 100)
    }));
  }, [stats]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Breadcrumbs & Title Row ── */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
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
            Managing {total} academic files across {departments.length} departments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExport}
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
            onClick={handleOpenAddModal}
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
      <div className="hidden md:grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">

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
          <h3 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>{stats.graduatedStudents || 0}</h3>
        </div>
      </div>

      {/* ── Main Layout (Full Width) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>

        {/* Filters and Table Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="flex flex-col sm:flex-row gap-3 md:items-center w-full md:w-auto" style={{ flex: 1, flexWrap: 'wrap', minWidth: 0 }}>
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
              <ResponsiveSelect
                value={deptFilter}
                onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
                placeholder="All Departments"
                label="Select Department"
                options={[
                  { value: '', label: 'All Departments' },
                  ...departments.map(d => ({ value: d.name, label: d.code || d.name }))
                ]}
              />

              {/* Batch Dropdown */}
              <ResponsiveSelect
                value={batchFilter}
                onChange={e => { setBatchFilter(e.target.value); setPage(1); }}
                placeholder="All Batches"
                label="Select Batch"
                options={[
                  { value: '', label: 'All Batches' },
                  ...batches.map(b => ({ value: b.code, label: b.code }))
                ]}
              />

              {/* Semester Dropdown */}
              <ResponsiveSelect
                value={semesterFilter}
                onChange={e => { setSemesterFilter(e.target.value); setPage(1); }}
                placeholder="All Semesters"
                label="Select Semester"
                options={[
                  { value: '', label: 'All Semesters' },
                  ...[1, 2, 3, 4, 5, 6, 7, 8].map(sem => ({ value: sem, label: `Semester ${sem}` })),
                  { value: 'graduated', label: 'Graduated' }
                ]}
              />

              {/* Session Dropdown */}
              <ResponsiveSelect
                value={sessionFilter}
                onChange={e => { setSessionFilter(e.target.value); setPage(1); }}
                placeholder="All Intake Terms"
                label="Select Intake Term"
                options={[
                  { value: '', label: 'All Intake Terms' },
                  { value: 'Spring', label: 'Spring Intake' },
                  { value: 'Fall', label: 'Fall Intake' }
                ]}
              />

              {/* Status Dropdown */}
              <ResponsiveSelect
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                placeholder="All Statuses"
                label="Select Status"
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />
            </div>

            <button
              onClick={handleClearFilters}
              style={{ border: 'none', backgroundColor: 'transparent', color: '#2563EB', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Clear Filters
            </button>
          </div>

          {/* Student Directory Table Card */}
          <div className="overflow-x-auto" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student ID & Session</th>
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
                  const initials = (s.name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const avatarColor = ['#3B82F6', '#10B981', '#6366F1', '#8B5CF6', '#EC4899'][idx % 5];
                  const isSpring = (s.intakeSession === 'Spring') || (!s.intakeSession && /-[0-9]{2}[Ss]-/.test(s.rollNumber || ''));
                  return (
                    <tr key={s._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                      {/* Student ID & Session Badge */}
                      <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontWeight: 600, color: '#475569', fontSize: '12px' }}>
                        <div>{s.rollNumber}</div>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: '4px',
                          marginTop: '3px',
                          backgroundColor: isSpring ? '#EEF2FF' : '#FEF3C7',
                          color: isSpring ? '#4F46E5' : '#D97706',
                          border: `1px solid ${isSpring ? '#C7D2FE' : '#FDE68A'}`
                        }}>
                          {isSpring ? '🌸 Spring' : '🍂 Fall'}
                        </span>
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
                        {s.status === 'graduated' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 8px',
                            backgroundColor: '#D1FAE5',
                            color: '#065F46',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}>Graduated</span>
                        ) : `Semester ${s.currentSemester}`}
                      </td>

                      {/* CGPA Progress Bar + Value */}
                      <td style={{ padding: '12px 20px' }}>
                        {s.currentSemester === 1 ? (
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>N/A</span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '5px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${((s.cgpa || 0) / 4.0) * 100}%`, height: '100%', backgroundColor: getCgpaColor(s.cgpa || 0), borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', minWidth: '28px' }}>
                              {(s.cgpa || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* View / Edit / Delete Actions */}
                      <td style={{ padding: '12px 20px', textAlign: 'right', display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setSelected(s)}
                          style={{ padding: '6px', border: 'none', backgroundColor: 'transparent', color: '#94A3B8', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#1E293B'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleEditClick(s)}
                          style={{ padding: '6px', border: 'none', backgroundColor: 'transparent', color: '#F59E0B', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF3C7'; e.currentTarget.style.color = '#D97706'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#F59E0B'; }}
                          title="Edit Student"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(s._id)}
                          style={{ padding: '6px', border: 'none', backgroundColor: 'transparent', color: '#EF4444', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEE2E2'; e.currentTarget.style.color = '#DC2626'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#EF4444'; }}
                          title="Delete Student"
                        >
                          <Trash2 size={15} />
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

        {/* Activities Card (Moved to full width below table) */}
        {(user?.role === 'dean' || user?.role === 'admin') && (
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Recent Activities</h3>
              <span
                onClick={() => setActiveNav && setActiveNav('audit_logs')}
                style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}
              >
                View All
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {auditLogs.length > 0 ? (
                auditLogs.map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: log.actionType.includes('FAILED') ? '#FEE2E2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: log.actionType.includes('FAILED') ? '#EF4444' : '#2563EB' }}>
                      {log.actionType.includes('INGESTED') ? <FileText size={12} /> : <UserPlus size={12} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', lineHeight: 1.2 }}>{log.actionType.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.2, wordBreak: 'break-word' }}>{log.metadata?.description || log.description || 'System Audit Log'}</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8', marginTop: '2px', textTransform: 'uppercase' }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '12px', gridColumn: '1 / -1' }}>No recent activities.</div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Bottom Section: Charts Panel ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_300px_320px] gap-4">

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
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{avgGpa}</span>
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
            {departmentStats.length > 0 ? (
              departmentStats.map((d, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{d.code}</span>
                    <span style={{ fontWeight: 700, color: '#1F2937' }}>{d.students}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${d.widthPct}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '3px' }} />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center' }}>No department statistics found.</div>
            )}
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
          <div style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, maxWidth: detailTab === 'profile' ? 480 : 900, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', transition: 'max-width 0.2s ease-in-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1B3A6B', display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={18} /> Student Details
              </h3>
              <button onClick={() => setSelected(null)} style={{ padding: 4, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#94A3B8' }}><X size={20} /></button>
            </div>

            {/* Tabs for details modal */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', gap: '16px', paddingBottom: '2px', marginBottom: '14px' }}>
              {[
                { id: 'profile', label: 'Basic Profile' },
                { id: 'academic', label: 'Academic Summary' },
                { id: 'degree', label: 'Degree Progress Plan' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id)}
                  style={{
                    padding: '8px 4px 10px', border: 'none', background: 'none',
                    borderBottom: detailTab === tab.id ? '2px solid #2563EB' : '2px solid transparent',
                    color: detailTab === tab.id ? '#2563EB' : '#64748B',
                    fontWeight: detailTab === tab.id ? 700 : 500,
                    fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {detailTab === 'profile' && (
              <>
                <div style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#2563EB' }}>
                    {(selected.name || '?').split(' ').filter(Boolean).map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{selected.name}</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748B' }}>{selected.rollNumber}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</div>
                    <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{selected.departmentId?.name || 'Computer Science'}</div>
                  </div>
                  <div style={{ padding: 12, border: '1px solid #E2E8F0', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Award size={14} color="#F59E0B" /> {selected.currentSemester === 1 ? 'N/A' : (selected.cgpa || 0).toFixed(2)}
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
              </>
            )}

            {detailTab === 'academic' && (
              <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                <AcademicSummary student={selected} />
              </div>
            )}

            {detailTab === 'degree' && (
              <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                <DegreeProgress student={selected} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add Student Form Modal ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #E2E8F0', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Enrol New Student</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>Add student file to institutional records</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} style={{ padding: '6px', border: 'none', backgroundColor: '#F1F5F9', borderRadius: '50%', cursor: 'pointer', color: '#64748B' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Roll Number with Auto-Generate Badge */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Roll Number *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newRoll = generateNextRollNumber(formData.departmentId, formData.batchId);
                        setFormData(f => ({ ...f, rollNumber: newRoll }));
                      }}
                      style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', border: 'none', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <RefreshCw size={10} /> Auto-Generate
                    </button>
                  </div>
                  <input
                    required
                    value={formData.rollNumber}
                    onChange={e => setFormData(f => ({ ...f, rollNumber: e.target.value }))}
                    placeholder="e.g. BSCS-24F-0014"
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', fontWeight: 600, outline: 'none', fontFamily: 'monospace', backgroundColor: '#F8FAFC' }}
                  />
                </div>

                {/* Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    Full Student Name *
                  </label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Muhammad Ahmed"
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Institutional Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                      placeholder="e.g. ahmed@stmu.edu.pk"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                      placeholder="e.g. +92 300 1234567"
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>

                {/* Department, Batch & Intake Term Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Department *
                    </label>
                    <ResponsiveSelect
                      value={formData.departmentId}
                      onChange={e => {
                        const newDeptId = e.target.value;
                        const newRoll = generateNextRollNumber(newDeptId, formData.batchId, formData.intakeSession);
                        setFormData(f => ({ ...f, departmentId: newDeptId, rollNumber: newRoll }));
                      }}
                      placeholder="Select Department..."
                      className="w-full"
                      options={departments.map(d => ({ value: d._id, label: d.name }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Batch *
                    </label>
                    <ResponsiveSelect
                      value={formData.batchId}
                      onChange={e => {
                        const newBatchId = e.target.value;
                        const newRoll = generateNextRollNumber(formData.departmentId, newBatchId, formData.intakeSession);
                        setFormData(f => ({ ...f, batchId: newBatchId, rollNumber: newRoll }));
                      }}
                      placeholder="Select Batch..."
                      className="w-full"
                      options={batches.map(b => ({ value: b._id, label: b.code }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Intake Term *
                    </label>
                    <ResponsiveSelect
                      value={formData.intakeSession || 'Fall'}
                      onChange={e => {
                        const newSession = e.target.value;
                        const newRoll = generateNextRollNumber(formData.departmentId, formData.batchId, newSession);
                        setFormData(f => ({ ...f, intakeSession: newSession, rollNumber: newRoll }));
                      }}
                      className="w-full"
                      options={[
                        { value: 'Fall', label: '🍂 Fall Intake' },
                        { value: 'Spring', label: '🌸 Spring Intake' }
                      ]}
                    />
                  </div>
                </div>

                {/* Semester & CGPA Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Current Semester *
                    </label>
                    <ResponsiveSelect
                      value={formData.currentSemester || 1}
                      onChange={e => setFormData(f => ({ ...f, currentSemester: Number(e.target.value) }))}
                      className="w-full"
                      options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(sem => ({ value: sem, label: `Semester ${sem}` }))}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      Initial CGPA
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      placeholder="0.00"
                      value={formData.cgpa}
                      onChange={e => setFormData(f => ({ ...f, cgpa: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>

              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#64748B', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#2563EB', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px', opacity: saving ? 0.7 : 1, fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}
                >
                  {saving ? 'Creating...' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Student Form Modal ── */}
      {showEditModal && editingStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #E2E8F0', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Edit Student Record</h3>
              <button onClick={() => { setShowEditModal(false); setEditingStudent(null); }} style={{ padding: '6px', border: 'none', backgroundColor: '#F1F5F9', borderRadius: '50%', cursor: 'pointer', color: '#64748B' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleEditSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Roll Number *</label>
                  <input required value={editForm.rollNumber} onChange={e => setEditForm(f => ({ ...f, rollNumber: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'monospace', backgroundColor: '#F8FAFC' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Full Student Name *</label>
                  <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Email</label>
                    <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Phone</label>
                    <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Department *</label>
                    <ResponsiveSelect
                      value={editForm.departmentId}
                      onChange={e => setEditForm(f => ({ ...f, departmentId: e.target.value }))}
                      placeholder="Select..."
                      className="w-full"
                      options={departments.map(d => ({ value: d._id, label: d.name }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Batch *</label>
                    <ResponsiveSelect
                      value={editForm.batchId}
                      onChange={e => setEditForm(f => ({ ...f, batchId: e.target.value }))}
                      placeholder="Select..."
                      className="w-full"
                      options={batches.map(b => ({ value: b._id, label: b.code }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Semester *</label>
                    <ResponsiveSelect
                      value={editForm.currentSemester || 1}
                      onChange={e => setEditForm(f => ({ ...f, currentSemester: Number(e.target.value) }))}
                      className="w-full"
                      options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(sem => ({ value: sem, label: `Semester ${sem}` }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Intake Term *</label>
                    <ResponsiveSelect
                      value={editForm.intakeSession || 'Fall'}
                      onChange={e => setEditForm(f => ({ ...f, intakeSession: e.target.value }))}
                      className="w-full"
                      options={[
                        { value: 'Fall', label: '🍂 Fall Intake' },
                        { value: 'Spring', label: '🌸 Spring Intake' }
                      ]}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>CGPA</label>
                    <input type="number" step="0.01" min="0" max="4" value={editForm.cgpa} onChange={e => setEditForm(f => ({ ...f, cgpa: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', border: '1px solid #CBD5E1', borderRadius: '10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Status *</label>
                    <ResponsiveSelect
                      value={editForm.status}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full"
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' }
                      ]}
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <button type="button" onClick={() => { setShowEditModal(false); setEditingStudent(null); }}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#64748B', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#2563EB', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px', opacity: saving ? 0.7 : 1, fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}