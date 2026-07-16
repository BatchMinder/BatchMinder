import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, ChevronDown, Plus, Bell, AlertTriangle,
  Users, UserCheck, Shield, Check, Calendar, Trash2, X, RefreshCw, Eye, EyeOff,
  ChevronLeft, ChevronRight, UserPlus, CheckCircle2, Edit2
} from 'lucide-react';
import { useDepartments } from '../../hooks/useDepartments';
import Header from './Header';
import { useModal } from '../../contexts/ModalContext';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button as MuiButton } from '@mui/material';

const ROLE_OPTIONS   = ['All Roles', 'Batch Advisor', 'HOD', 'Administrator', 'Dean'];
const STATUS_OPTIONS = ['All Status', 'Active', 'Pending', 'Inactive'];

const STATUS_STYLE = {
  Active:   { bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0' },
  Pending:  { bg: '#FEF9C3', color: '#D97706', border: '#FDE68A' },
  Inactive: { bg: '#FEE2E2', color: '#EF4444', border: '#FECACA' },
};

export default function UserManagement({ setActiveNav }) {
  const { departments, isLoading: deptsLoading } = useDepartments();
  const { showConfirm, showAlert, showSuccess } = useModal();

  const [users, setUsers]         = useState([]);
  const [batches, setBatches]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const [search, setSearch]       = useState('');
  const [roleFilter, setRole]     = useState('All Roles');
  const [deptFilter, setDept]     = useState('All Departments');
  const [statusFilter, setStatus] = useState('All Status');
  const [selected, setSelected]   = useState([]);
  const [currentPage, setPage]    = useState(1);

  // Edit / Create Form states
  const [editingUserId, setEditingUserId] = useState(null);
  const [viewingUserId, setViewingUserId] = useState(null);
  const [form, setForm] = useState({
    name:       '',
    email:      '',
    employeeId: '',
    phone:      '',
    role:       'Batch Advisor',
    dept:       '',
    status:     'Active',
    password:   '',
    batchId:    '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const DEPT_OPTIONS = ['All Departments', ...departments.map(d => d.name)];


  useEffect(() => {
    if (!editingUserId && !viewingUserId && departments.length > 0 && !form.dept) {
      setForm(prev => ({ ...prev, dept: departments[0].name }));
    }
  }, [departments, editingUserId, viewingUserId]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, batchRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/batches')
      ]);
      const [userData, batchData] = await Promise.all([
        userRes.json(),
        batchRes.json()
      ]);
      
      if (userRes.ok && userData.status === 'success') {
        setUsers(userData.data);
      } else {
        setError(userData.message || 'Failed to retrieve user directory.');
      }
      
      if (batchRes.ok && batchData.status === 'success') {
        setBatches(batchData.data);
      }
    } catch (err) {
      setError('Connection failure: Unable to fetch user list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRowClick = (u) => {
    setEditingUserId(u.id);
    setViewingUserId(null);
    setForm({
      name:       u.name || '',
      email:      u.email || '',
      employeeId: u.employeeId || '',
      phone:      u.phone || '',
      role:       u.role || 'Batch Advisor',
      dept:       u.dept || '',
      status:     u.status || 'Active',
      password:   u.password || '••••••••',
      batchId:    u.batches?.[0] || '', // Might not map perfectly unless we search batches
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleViewClick = (u) => {
    setViewingUserId(u.id);
    setEditingUserId(null);
    setForm({
      name:       u.name || '',
      email:      u.email || '',
      employeeId: u.employeeId || '',
      phone:      u.phone || '',
      role:       u.role || 'Batch Advisor',
      dept:       u.dept || '',
      status:     u.status || 'Active',
      password:   u.password || '••••••••',
      batchId:    u.batches?.[0] || '',
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleClearForm = () => {
    setEditingUserId(null);
    setViewingUserId(null);
    setForm({
      name:       '',
      email:      '',
      employeeId: '',
      phone:      '',
      role:       'Batch Advisor',
      dept:       departments.length > 0 ? departments[0].name : '',
      status:     'Active',
      password:   '',
      batchId:    '',
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!form.name || !form.email) {
      setFormError('Name and Institutional Email are required fields.');
      return;
    }

    try {
      const method = editingUserId ? 'PATCH' : 'POST';
      const url = editingUserId ? `/api/users/${editingUserId}` : '/api/users';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        if (form.batchId) {
          try {
            await fetch(`/api/batches/${form.batchId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ advisor: form.name })
            });
          } catch (e) {
            console.error('Failed to assign batch', e);
          }
        }
        const msg = editingUserId ? 'User details updated successfully!' : 'User account created successfully!';
        setFormSuccess(msg);
        showSuccess(msg);
        handleClearForm();
        fetchUsers();
      } else {
        setFormError(data.message || 'Operation failed.');
      }
    } catch (err) {
      setFormError('Failed to communicate with authorization server.');
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = await showConfirm(
      'Delete User Account',
      'Are you sure you want to permanently delete this user account? This action cannot be undone.',
      'Delete',
      'Cancel',
      '#EF4444'
    );
    if (!confirmed) return;
    setFormError('');
    setFormSuccess('');

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (response.ok) {
        setFormSuccess('User deleted successfully.');
        showSuccess('User deleted successfully.');
        handleClearForm();
        fetchUsers();
      } else {
        setFormError(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      setFormError('Failed to communicate with authorization server.');
    }
  };

  // Filter actual database users
  const filtered = useMemo(() => {
    const dbUsers = users.map(u => ({
      id: u.id || u._id,
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'Batch Advisor',
      dept: u.dept || 'Computer Science',
      employeeId: u.employeeId || '—',
      phone: u.phone || '—',
      status: u.status || 'Active',
      color: u.color || '#3B82F6',
      initials: u.initials || (u.name ? u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'),
      batches: u.batches || (u.assignedBatchIds?.length > 0 ? 'Assigned' : 'Unassigned'),
      lastLogin: u.lastLogin || 'Yesterday'
    }));

    return dbUsers.filter(u => {
      const q = search.toLowerCase();
      const nameVal = u.name ? u.name.toLowerCase() : '';
      const emailVal = u.email ? u.email.toLowerCase() : '';
      const deptVal = u.dept ? u.dept.toLowerCase() : '';

      const matchesSearch = !search || nameVal.includes(q) || emailVal.includes(q) || deptVal.includes(q);
      const matchesRole = roleFilter === 'All Roles' || u.role === roleFilter;
      const matchesDept = deptFilter === 'All Departments' || u.dept === deptFilter;
      const matchesStatus = statusFilter === 'All Status' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [users, search, roleFilter, deptFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / 8));
  const toggleRow  = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const stats = useMemo(() => {
    const total = users.length;
    const advisors = users.filter(u => u.role === 'Batch Advisor' || u.role === 'advisor').length;
    const hods = users.filter(u => u.role === 'HOD' || u.role === 'admin').length;
    const admins = users.filter(u => u.role === 'Administrator' || u.role === 'academic_admin').length;
    const inactive = users.filter(u => u.status?.toLowerCase() === 'inactive').length;
    return { total, advisors, hods, admins, inactive };
  }, [users]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

      <Header
        title="User Management"
        subtitle="BatchMinder ERP • Dean • Users"
        setActiveNav={setActiveNav}
      />

      {/* ── Scrollable Body Container ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '24px', backgroundColor: '#F8FAFC', overflowY: 'auto' }}>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-5">
          {/* Card 1 */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={18} color="#2563EB" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{stats.total}</p>
              <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total Users</p>
            </div>
          </div>

          {/* Card 2 */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserCheck size={18} color="#7C3AED" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{stats.advisors}</p>
              <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Batch Advisors</p>
            </div>
          </div>

          {/* Card 3 */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ECFEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={18} color="#0891B2" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{stats.hods}</p>
              <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>HODs</p>
            </div>
          </div>

          {/* Card 4 */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={18} color="#059669" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{stats.admins}</p>
              <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Administrators</p>
            </div>
          </div>

          {/* Card 5 */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={18} color="#EF4444" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#EF4444', lineHeight: 1.1 }}>{stats.inactive}</p>
              <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Inactive Users</p>
            </div>
          </div>
        </div>

        {/* Two-column main dashboard layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-stretch flex-1">

          {/* Left Column: Directory Directory Table Card */}
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: '14px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex', flexDirection: 'column', height: '100%'
          }}>

            {/* Filters row matching Screenshot 2 */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
              backgroundColor: '#FAFAFA'
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Dr. Fatima"
                  style={{
                    width: '100%', padding: '7px 10px 7px 30px', borderRadius: '8px',
                    border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                    backgroundColor: '#FFFFFF'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Role select */}
                <select
                  value={roleFilter}
                  onChange={e => setRole(e.target.value)}
                  style={{ padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', color: '#475569', backgroundColor: '#FFFFFF', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {ROLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>

                {/* Department select */}
                <select
                  value={deptFilter}
                  onChange={e => setDept(e.target.value)}
                  style={{ padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', color: '#475569', backgroundColor: '#FFFFFF', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {DEPT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>

                {/* Status select */}
                <select
                  value={statusFilter}
                  onChange={e => setStatus(e.target.value)}
                  style={{ padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', color: '#475569', backgroundColor: '#FFFFFF', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            {/* Table wrapper */}
            <div className="overflow-x-auto w-full" style={{ flex: 1, overflowY: 'auto' }}>
              {loading && filtered.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '10px' }}>
                  <RefreshCw size={20} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '12px', color: '#64748B' }}>Loading user directory...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#94A3B8' }}>
                  <Users size={32} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>No users found</span>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ width: '38px', padding: '10px 14px' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} />
                      </th>
                      {['USER', 'ROLE', 'DEPARTMENT', 'ASSIGNED BATCH(ES)', 'LAST LOGIN', 'STATUS', 'ACTIONS'].map(col => (
                        <th key={col} style={{
                          padding: '10px 12px', textAlign: 'left',
                          fontSize: '10px', fontWeight: 800, color: '#94A3B8',
                          letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap'
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((currentPage - 1) * 8, currentPage * 8).map((u, i) => {
                      const isSel = selected.includes(u.id) || editingUserId === u.id;
                      const ss    = STATUS_STYLE[u.status] || STATUS_STYLE.Active;
                      return (
                        <tr
                          key={u.id}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: isSel ? '#EFF6FF' : '#FFFFFF',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                        >
                          <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleRow(u.id)} style={{ cursor: 'pointer' }} />
                          </td>
                          
                          {/* USER */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                backgroundColor: u.color, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 700, color: '#FFFFFF'
                              }}>{u.initials}</div>
                              <div>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{u.name}</p>
                                <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8' }}>{u.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* ROLE */}
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              fontSize: '11px', fontWeight: 600, color: '#475569'
                            }}>
                              {u.role === 'Batch Advisor' ? '🎓 Batch Advisor' : u.role === 'HOD' ? '🏛️ HOD' : '🛡️ Admin'}
                            </span>
                          </td>

                          {/* DEPARTMENT */}
                          <td style={{ padding: '10px 12px', fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                            {u.dept}
                          </td>

                          {/* ASSIGNED BATCHES */}
                          <td style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>
                            {u.batches}
                          </td>

                          {/* LAST LOGIN */}
                          <td style={{ padding: '10px 12px', fontSize: '11px', color: '#64748B' }}>
                            {u.lastLogin}
                          </td>

                          {/* STATUS */}
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '12px',
                              fontSize: '11px', fontWeight: 700,
                              backgroundColor: ss.bg, color: ss.color,
                              border: `1px solid ${ss.border}`, whiteSpace: 'nowrap'
                            }}>{u.status}</span>
                          </td>

                          {/* ACTIONS */}
                          <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                title="Edit User"
                                onClick={() => handleRowClick(u)}
                                style={{
                                  padding: '5px', border: 'none', backgroundColor: 'transparent',
                                  color: '#64748B', cursor: 'pointer', borderRadius: '4px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#2563EB'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                title="View User"
                                onClick={() => handleViewClick(u)}
                                style={{
                                  padding: '5px', border: 'none', backgroundColor: 'transparent',
                                  color: '#64748B', cursor: 'pointer', borderRadius: '4px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#10B981'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                title="Delete User"
                                onClick={() => handleDeleteUser(u.id)}
                                style={{
                                  padding: '5px', border: 'none', backgroundColor: 'transparent',
                                  color: '#64748B', cursor: 'pointer', borderRadius: '4px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEE2E2'; e.currentTarget.style.color = '#EF4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination footer */}
            <div style={{
              padding: '12px 16px', borderTop: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#FAFAFA'
            }}>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>
                Showing {filtered.length === 0 ? 0 : (currentPage - 1) * 8 + 1}–{Math.min(currentPage * 8, filtered.length)} of {filtered.length} users
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF', cursor: currentPage > 1 ? 'pointer' : 'not-allowed',
                    opacity: currentPage > 1 ? 1 : 0.5
                  }}
                >
                  &larr;
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                      backgroundColor: currentPage === n ? '#2563EB' : 'transparent',
                      color: currentPage === n ? '#FFFFFF' : '#64748B',
                      fontSize: '11px', fontWeight: currentPage === n ? 700 : 600,
                      cursor: 'pointer'
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF', cursor: currentPage < totalPages ? 'pointer' : 'not-allowed',
                    opacity: currentPage < totalPages ? 1 : 0.5
                  }}
                >
                  &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Add New User Form & Role Distribution */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            
            {/* Create/Edit Form card */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '14px', padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} color="#2563EB" /> 
                  Add New User
                </h3>

              </div>

              {formError && (
                <div style={{ padding: '8px 10px', marginBottom: '10px', borderRadius: '6px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '11px', fontWeight: 600 }}>
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div style={{ padding: '8px 10px', marginBottom: '10px', borderRadius: '6px', backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', color: '#15803D', fontSize: '11px', fontWeight: 600 }}>
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Fatima Malik"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Institutional Email</label>
                  <input
                    type="email"
                    required
                    placeholder="f.malik@stmu.edu.pk"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Role</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.role}
                      onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569', outline: 'none', cursor: 'pointer', appearance: 'none', fontFamily: 'inherit' }}
                    >
                      {ROLE_OPTIONS.slice(1).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Department</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.dept}
                      onChange={e => setForm(p => ({ ...p, dept: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569', outline: 'none', cursor: departments.length === 0 ? 'not-allowed' : 'pointer', appearance: 'none', fontFamily: 'inherit' }}
                      disabled={departments.length === 0}
                    >
                      {departments.length === 0 ? (
                        <option value="">No departments available</option>
                      ) : (
                        departments.map(d => <option key={d.id} value={d.name}>{d.name} ({d.code})</option>)
                      )}
                    </select>
                    <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Assign Batch</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.batchId}
                      onChange={e => setForm(p => ({ ...p, batchId: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569', outline: 'none', cursor: batches.length === 0 ? 'not-allowed' : 'pointer', appearance: 'none', fontFamily: 'inherit' }}
                      disabled={batches.length === 0}
                    >
                      <option value="">Select a batch (Unassigned)</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.code} {b.advisor && b.advisor !== 'Unassigned' ? `(Assigned to ${b.advisor})` : '(Unassigned)'}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Employee ID</label>
                  <input
                    type="text"
                    placeholder="STMU-2024-ADV-047"
                    value={form.employeeId}
                    onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Phone</label>
                  <input
                    type="text"
                    placeholder="+92 300 1234567"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                  <button
                    type="submit"
                    style={{
                      width: '100%', marginTop: '6px', padding: '9px',
                      borderRadius: '8px', border: 'none',
                      backgroundColor: '#2563EB', color: '#FFFFFF',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      fontFamily: 'inherit', transition: 'background 0.15s',
                      boxShadow: '0 4px 10px rgba(37,99,235,0.15)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1D4ED8'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#2563EB'}
                  >
                    <CheckCircle2 size={13} /> Create User Account
                  </button>
              </form>

            </div>

            {/* Role Distribution Panel */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '14px', padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              flex: 1, display: 'flex', flexDirection: 'column'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                Role Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
                
                {/* Advisors */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Batch Advisors</span>
                    <span style={{ fontWeight: 700, color: '#1F2937' }}>{stats.advisors} / {stats.total}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(stats.advisors / (stats.total || 1)) * 100}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* HODs */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>HODs</span>
                    <span style={{ fontWeight: 700, color: '#1F2937' }}>{stats.hods} / {stats.total}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(stats.hods / (stats.total || 1)) * 100}%`, height: '100%', backgroundColor: '#7C3AED', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* Admins */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Administrators</span>
                    <span style={{ fontWeight: 700, color: '#1F2937' }}>{stats.admins} / {stats.total}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(stats.admins / (stats.total || 1)) * 100}%`, height: '100%', backgroundColor: '#059669', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* Inactive */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Inactive</span>
                    <span style={{ fontWeight: 700, color: '#1F2937' }}>{stats.inactive} / {stats.total}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${(stats.inactive / (stats.total || 1)) * 100}%`, height: '100%', backgroundColor: '#D97706', borderRadius: '3px' }} />
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      <Dialog 
        open={!!(editingUserId || viewingUserId)} 
        onClose={handleClearForm}
        maxWidth="sm"
        fullWidth
        PaperProps={{ style: { borderRadius: '14px', padding: '10px' } }}
      >
        <DialogTitle style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {viewingUserId ? <Eye size={18} color="#10B981" /> : <Shield size={18} color="#7C3AED" />}
          {viewingUserId ? 'View User Profile' : 'Modify User Profile'}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <div style={{ padding: '8px 10px', marginBottom: '10px', borderRadius: '6px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '11px', fontWeight: 600 }}>
              {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{ padding: '8px 10px', marginBottom: '10px', borderRadius: '6px', backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', color: '#15803D', fontSize: '11px', fontWeight: 600 }}>
              {formSuccess}
            </div>
          )}
          <form id="edit-user-form" onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Full Name</label>
              <input type="text" required disabled={!!viewingUserId} placeholder="Dr. Fatima Malik" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B', outline: 'none', fontFamily: 'inherit', opacity: viewingUserId ? 0.7 : 1, cursor: viewingUserId ? 'not-allowed' : 'text' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Institutional Email</label>
              <input type="email" required disabled={!!viewingUserId} placeholder="f.malik@stmu.edu.pk" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B', outline: 'none', fontFamily: 'inherit', opacity: viewingUserId ? 0.7 : 1, cursor: viewingUserId ? 'not-allowed' : 'text' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Role</label>
              <div style={{ position: 'relative' }}>
                <select value={form.role} disabled={!!viewingUserId} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569', outline: 'none', cursor: viewingUserId ? 'not-allowed' : 'pointer', appearance: 'none', fontFamily: 'inherit', opacity: viewingUserId ? 0.7 : 1 }}>
                  {ROLE_OPTIONS.slice(1).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Department</label>
              <div style={{ position: 'relative' }}>
                <select value={form.dept} disabled={!!viewingUserId || departments.length === 0} onChange={e => setForm(p => ({ ...p, dept: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569', outline: 'none', cursor: (viewingUserId || departments.length === 0) ? 'not-allowed' : 'pointer', appearance: 'none', fontFamily: 'inherit', opacity: viewingUserId ? 0.7 : 1 }}>
                  {departments.length === 0 ? (
                    <option value="">No departments available</option>
                  ) : (
                    departments.map(d => <option key={d.id} value={d.name}>{d.name} ({d.code})</option>)
                  )}
                </select>
                <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Assign Batch</label>
              <div style={{ position: 'relative' }}>
                <select value={form.batchId} disabled={!!viewingUserId || batches.length === 0} onChange={e => setForm(p => ({ ...p, batchId: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569', outline: 'none', cursor: (viewingUserId || batches.length === 0) ? 'not-allowed' : 'pointer', appearance: 'none', fontFamily: 'inherit', opacity: viewingUserId ? 0.7 : 1 }}>
                  <option value="">Select a batch (Unassigned)</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.code} {b.advisor && b.advisor !== 'Unassigned' ? `(Assigned to ${b.advisor})` : '(Unassigned)'}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Employee ID</label>
              <input type="text" disabled={!!viewingUserId} placeholder="STMU-2024-ADV-047" value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B', outline: 'none', fontFamily: 'inherit', opacity: viewingUserId ? 0.7 : 1, cursor: viewingUserId ? 'not-allowed' : 'text' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Phone</label>
              <input type="text" disabled={!!viewingUserId} placeholder="+92 300 1234567" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B', outline: 'none', fontFamily: 'inherit', opacity: viewingUserId ? 0.7 : 1, cursor: viewingUserId ? 'not-allowed' : 'text' }} />
            </div>
          </form>
          {editingUserId && (
            <button
              onClick={() => handleDeleteUser(editingUserId)}
              style={{ width: '100%', marginTop: '16px', padding: '8px', borderRadius: '8px', border: '1px solid #FCA5A5', backgroundColor: '#FFF5F5', color: '#C53030', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFF5F5'; }}
            >
              <Trash2 size={12} /> Delete User Account
            </button>
          )}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <MuiButton onClick={handleClearForm} style={{ color: '#64748B', fontWeight: 600 }}>Close</MuiButton>
          {!viewingUserId && (
            <MuiButton type="submit" form="edit-user-form" variant="contained" style={{ backgroundColor: '#2563EB', borderRadius: '8px', fontWeight: 600, textTransform: 'none' }}>
              Save Changes
            </MuiButton>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
}
