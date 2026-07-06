import React, { useState, useEffect } from 'react';
import {
  Search, ChevronDown, Plus, Bell, AlertTriangle,
  Users, UserCheck, Shield, Check, Calendar, Trash2, X, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { useDepartments } from '../../hooks/useDepartments';
import Header from './Header';

const ROLE_OPTIONS   = ['All Roles', 'Batch Advisor', 'HOD', 'Administrator', 'Super Admin'];
const STATUS_OPTIONS = ['All Status', 'Active', 'Pending', 'Inactive'];

const STATUS_STYLE = {
  Active:   { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
  Pending:  { bg: '#FEF9C3', color: '#A16207', border: '#FDE68A' },
  Inactive: { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
};

function Dropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 11px', borderRadius: '7px',
          border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF',
          fontSize: '12px', fontWeight: 500, color: '#374151',
          cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit'
        }}
      >
        {value} <ChevronDown size={12} color="#94A3B8" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50,
          marginTop: '4px', borderRadius: '9px',
          backgroundColor: '#fff', border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: '150px', overflow: 'hidden'
        }}>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '8px 13px',
                textAlign: 'left', fontSize: '12px',
                fontWeight: opt === value ? 600 : 400,
                color: opt === value ? '#2563EB' : '#374151',
                backgroundColor: opt === value ? '#EFF6FF' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit'
              }}
              onMouseEnter={e => { if (opt !== value) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
              onMouseLeave={e => { if (opt !== value) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UserManagement({ setActiveNav }) {
  const { departments, isLoading: deptsLoading } = useDepartments();

  const [users, setUsers]         = useState([]);
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
  const [form, setForm] = useState({
    name:       '',
    email:      '',
    employeeId: '',
    phone:      '',
    role:       'Batch Advisor',
    dept:       '',
    status:     'Active',
    password:   '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const DEPT_OPTIONS = ['All Departments', ...departments.map(d => d.name)];

  useEffect(() => {
    if (!editingUserId && departments.length > 0 && !form.dept) {
      setForm(prev => ({ ...prev, dept: departments[0].name }));
    }
  }, [departments, editingUserId]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setUsers(data.data);
      } else {
        setError(data.message || 'Failed to retrieve user directory.');
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
    setForm({
      name:       u.name || '',
      email:      u.email || '',
      employeeId: u.employeeId || '',
      phone:      u.phone || '',
      role:       u.role || 'Batch Advisor',
      dept:       u.dept || '',
      status:     u.status || 'Active',
      password:   u.password || '••••••••',
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleClearForm = () => {
    setEditingUserId(null);
    setForm({
      name:       '',
      email:      '',
      employeeId: '',
      phone:      '',
      role:       'Batch Advisor',
      dept:       departments.length > 0 ? departments[0].name : '',
      status:     'Active',
      password:   '',
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
        setFormSuccess(editingUserId ? 'User details updated successfully!' : 'User account created successfully!');
        if (!editingUserId) {
          handleClearForm();
        }
        fetchUsers();
      } else {
        setFormError(data.message || 'Operation failed.');
      }
    } catch (err) {
      setFormError('Failed to communicate with authorization server.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user account?')) return;
    setFormError('');
    setFormSuccess('');

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (response.ok) {
        setFormSuccess('User deleted successfully.');
        handleClearForm();
        fetchUsers();
      } else {
        setFormError(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      setFormError('Failed to communicate with authorization server.');
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (roleFilter   === 'All Roles'       || u.role   === roleFilter) &&
      (deptFilter   === 'All Departments' || u.dept   === deptFilter) &&
      (statusFilter === 'All Status'      || u.status === statusFilter)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / 12));
  const toggleRow  = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const stats = [
    { label: 'Total Users',    value: users.length, icon: Users,         iconColor: '#2563EB', iconBg: '#EFF6FF', highlight: false },
    { label: 'Batch Advisors', value: users.filter(u => u.role === 'Batch Advisor').length, icon: UserCheck,     iconColor: '#7C3AED', iconBg: '#F5F3FF', highlight: false },
    { label: 'HODs',           value: users.filter(u => u.role === 'HOD').length,  icon: Shield,        iconColor: '#0891B2', iconBg: '#ECFEFF', highlight: false },
    { label: 'Administrators', value: users.filter(u => u.role === 'Administrator').length,  icon: Shield,        iconColor: '#059669', iconBg: '#F0FDF4', highlight: false },
    { label: 'Inactive Users', value: users.filter(u => u.status === 'Inactive').length,  icon: AlertTriangle, iconColor: '#D97706', iconBg: '#FFFBEB', highlight: true  },
  ];

  // Dynamic role distribution based on DB state
  const roleDistribution = [
    { label: 'Batch Advisors', count: users.filter(u => u.role === 'Batch Advisor').length, color: '#2563EB' },
    { label: 'HODs',           count: users.filter(u => u.role === 'HOD').length, color: '#7C3AED' },
    { label: 'Administrators', count: users.filter(u => u.role === 'Administrator').length, color: '#059669' },
    { label: 'Super Admins',   count: users.filter(u => u.role === 'Super Admin').length, color: '#E11D48' },
    { label: 'Inactive',       count: users.filter(u => u.status === 'Inactive').length, color: '#D97706' },
  ];

  // Compact input/label styles for the right panel form
  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: '7px',
    border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    backgroundColor: '#FFFFFF'
  };
  const selectStyle = { ...inputStyle, paddingRight: '28px', appearance: 'none', cursor: 'pointer' };
  const labelStyle  = {
    display: 'block', fontSize: '10px', fontWeight: 700,
    color: '#94A3B8', letterSpacing: '0.7px',
    textTransform: 'uppercase', marginBottom: '4px'
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minWidth: 0, height: '100%', overflow: 'hidden',
      fontFamily: "'Inter','Liberation Sans',-apple-system,sans-serif"
    }}>

      <Header title="User Management" subtitle="BatchMinder ERP • Super Admin • Users" setActiveNav={setActiveNav} />

      {/* ── Scrollable Body Container ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '18px 24px', backgroundColor: '#F8FAFC', overflowY: 'auto' }}>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '18px' }}>
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '11px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '9px',
                  backgroundColor: s.iconBg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={17} color={s.iconColor} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '21px', fontWeight: 800, color: s.highlight ? '#B91C1C' : '#0F172A', lineHeight: 1.1 }}>
                    {loading ? '...' : s.value}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {s.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'stretch', flex: 1 }}>

          {/* ── Left Side: Directory Table Card ── */}
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: '13px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', height: '100%'
          }}>

            {/* Filter Bar */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
              backgroundColor: '#FAFAFA'
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email, department..."
                  style={{
                    width: '100%', padding: '7px 10px 7px 30px', borderRadius: '7px',
                    border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Dropdown value={roleFilter} options={ROLE_OPTIONS} onChange={setRole} />
                <Dropdown value={deptFilter} options={DEPT_OPTIONS} onChange={setDept} />
                <Dropdown value={statusFilter} options={STATUS_OPTIONS} onChange={setStatus} />
              </div>
            </div>

            {/* Table or States */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                  <RefreshCw size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Loading active user directory...</span>
                </div>
              ) : error ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                  <AlertTriangle size={28} color="#EF4444" />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{error}</p>
                    <button
                      onClick={fetchUsers}
                      style={{
                        marginTop: '10px', padding: '6px 14px', borderRadius: '6px',
                        border: 'none', backgroundColor: '#2563EB', color: '#fff',
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#94A3B8' }}>
                  <Users size={32} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>No users match the search filters.</span>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC' }}>
                      <th style={{ width: '34px', padding: '9px 13px' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} />
                      </th>
                      {['USER','ROLE','DEPARTMENT','EMPLOYEE ID','PHONE','STATUS'].map(col => (
                        <th key={col} style={{
                          padding: '9px 10px', textAlign: 'left',
                          fontSize: '9.5px', fontWeight: 800, color: '#94A3B8',
                          letterSpacing: '0.7px', textTransform: 'uppercase', whiteSpace: 'nowrap'
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((currentPage-1)*12, currentPage*12).map((u, i) => {
                      const isSel = selected.includes(u.id) || editingUserId === u.id;
                      const ss    = STATUS_STYLE[u.status] || STATUS_STYLE.Active;
                      return (
                        <tr
                          key={u.id}
                          onClick={() => handleRowClick(u)}
                          style={{
                            borderTop: '1px solid #F1F5F9',
                            backgroundColor: isSel ? '#EFF6FF' : (i % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                            cursor: 'pointer',
                            transition: 'background 0.1s'
                          }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#FFFFFF' : '#FAFAFA'; }}
                        >
                          <td style={{ padding: '9px 13px' }} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleRow(u.id)} style={{ cursor: 'pointer' }} />
                          </td>
                          <td style={{ padding: '9px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '7px',
                                backgroundColor: u.color, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '10px', fontWeight: 700, color: '#fff', letterSpacing: '0.3px'
                              }}>{u.initials}</div>
                              <div>
                                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{u.name}</p>
                                <p style={{ margin: 0, fontSize: '10px', color: '#94A3B8' }}>{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '9px 10px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '5px',
                              backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0',
                              fontSize: '10px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap'
                            }}>{u.role}</span>
                          </td>
                          <td style={{ padding: '9px 10px', fontSize: '11px', color: '#374151' }}>{u.dept || '—'}</td>
                          <td style={{ padding: '9px 10px', fontSize: '11px', color: '#374151' }}>{u.employeeId || '—'}</td>
                          <td style={{ padding: '9px 10px', fontSize: '11px', color: '#374151' }}>{u.phone || '—'}</td>
                          <td style={{ padding: '9px 10px' }}>
                            <span style={{
                              padding: '2px 9px', borderRadius: '18px',
                              fontSize: '10px', fontWeight: 700,
                              backgroundColor: ss.bg, color: ss.color,
                              border: `1px solid ${ss.border}`, whiteSpace: 'nowrap'
                            }}>{u.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div style={{
              padding: '11px 16px', borderTop: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                Showing {filtered.length === 0 ? 0 : (currentPage-1)*12 + 1}–{Math.min(currentPage*12, filtered.length)} of {filtered.length} users
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))}
                  style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#fff', cursor: 'pointer', fontSize: '12px', color: '#64748B', fontFamily: 'inherit' }}>←</button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)} style={{
                    width: '28px', height: '28px', borderRadius: '6px', border: '1px solid',
                    borderColor: currentPage===n ? '#2563EB' : '#E2E8F0',
                    backgroundColor: currentPage===n ? '#2563EB' : '#fff',
                    color: currentPage===n ? '#fff' : '#374151',
                    fontSize: '11px', fontWeight: currentPage===n ? 700 : 400,
                    cursor: 'pointer', fontFamily: 'inherit'
                  }}>{n}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))}
                  style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#fff', cursor: 'pointer', fontSize: '12px', color: '#64748B', fontFamily: 'inherit' }}>→</button>
              </div>
            </div>
          </div>

          {/* ── Right panel: Creation / Modification Form ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>

            {/* Config panel */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '13px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '13px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {editingUserId ? <Shield size={13} color="#7C3AED" /> : <Plus size={13} color="#2563EB" />} 
                  {editingUserId ? 'Modify User Profile' : 'Create User Account'}
                </h3>
                {editingUserId && (
                  <button 
                    onClick={handleClearForm}
                    style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94A3B8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {formError && (
                <div style={{
                  padding: '8px 10px', marginBottom: '12px', borderRadius: '6px',
                  backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5',
                  color: '#B91C1C', fontSize: '11px', fontWeight: 600
                }}>
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div style={{
                  padding: '8px 10px', marginBottom: '12px', borderRadius: '6px',
                  backgroundColor: '#DCFCE7', border: '1px solid #86EFAC',
                  color: '#15803D', fontSize: '11px', fontWeight: 600
                }}>
                  {formSuccess}
                </div>
              )}

              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Institutional Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Employee ID</label>
                  <input
                    type="text"
                    value={form.employeeId}
                    onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{editingUserId ? 'Change Password' : 'Password'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUserId}
                      placeholder={editingUserId ? '••••••••' : 'e.g. password123'}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      style={{ ...inputStyle, paddingRight: '36px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', color: '#94A3B8'
                      }}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Role Assignment</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.role}
                      onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                      style={selectStyle}
                    >
                      {ROLE_OPTIONS.slice(1).map(o => <option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Department</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.dept}
                      onChange={e => setForm(p => ({ ...p, dept: e.target.value }))}
                      style={selectStyle}
                      disabled={departments.length === 0}
                    >
                      {departments.length === 0 ? (
                        <option value="">No departments available — create one first</option>
                      ) : (
                        departments.map(d => (
                          <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                        ))
                      )}
                    </select>
                    <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {editingUserId && (
                  <div>
                    <label style={labelStyle}>Account Status</label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={form.status}
                        onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                        style={selectStyle}
                      >
                        {STATUS_OPTIONS.slice(1).map(o => <option key={o}>{o}</option>)}
                      </select>
                      <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                )}

                {departments.length === 0 && (
                  <div style={{
                    padding: '8px 10px', marginTop: '4px', borderRadius: '6px',
                    backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
                    color: '#B45309', fontSize: '11px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                    <AlertTriangle size={12} />
                    Please create at least one department first.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={departments.length === 0}
                  style={{
                    width: '100%', marginTop: '6px', padding: '9px',
                    borderRadius: '8px', border: 'none',
                    backgroundColor: departments.length === 0 ? '#CBD5E1' : (editingUserId ? '#7C3AED' : '#2563EB'),
                    color: departments.length === 0 ? '#94A3B8' : '#fff',
                    fontSize: '12px', fontWeight: 700, cursor: departments.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    fontFamily: 'inherit', transition: 'filter 0.15s'
                  }}
                  onMouseEnter={e => { if (departments.length > 0) e.currentTarget.style.filter = 'brightness(90%)'; }}
                  onMouseLeave={e => { if (departments.length > 0) e.currentTarget.style.filter = 'brightness(100%)'; }}
                >
                  <Check size={13} /> {editingUserId ? 'Save User Changes' : 'Create User Account'}
                </button>
              </form>

              {editingUserId && (
                <button
                  onClick={() => handleDeleteUser(editingUserId)}
                  style={{
                    width: '100%', marginTop: '8px', padding: '8px',
                    borderRadius: '8px', border: '1px solid #FCA5A5',
                    backgroundColor: '#FFF5F5', color: '#C53030',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    fontFamily: 'inherit', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFF5F5'; }}
                >
                  <Trash2 size={12} /> Delete User Account
                </button>
              )}
            </div>

            {/* Role Distribution */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '13px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              flex: 1, display: 'flex', flexDirection: 'column'
            }}>
              <h3 style={{ margin: '0 0 13px', fontSize: '13px', fontWeight: 700, color: '#0F172A', flexShrink: 0 }}>
                Role Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', flex: 1, overflowY: 'auto' }}>
                {roleDistribution.map((r, i) => {
                  const pct = users.length > 0 ? (r.count / users.length) * 100 : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{r.label}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>{r.count} / {users.length}</span>
                      </div>
                      <div style={{ height: '5px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          backgroundColor: r.color,
                          width: `${pct}%`
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
