import React, { useState, useEffect } from 'react';
import {
  Search, ChevronDown, Plus, Bell, AlertTriangle,
  Home, Check, Calendar, Trash2, X, RefreshCw,
  Layers, Users, BookOpen
} from 'lucide-react';
import Header from './Header';

const STATUS_OPTIONS = ['All Status', 'Active', 'Inactive'];

const STATUS_STYLE = {
  Active:   { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
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

export default function DepartmentManagement({ setActiveNav }) {
  const [depts, setDepts]           = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('All Status');
  const [selected, setSelected]     = useState([]);
  const [currentPage, setPage]      = useState(1);

  // Form state
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    hod: 'Unassigned',
    established: new Date().getFullYear(),
    status: 'Active',
    color: '#2563EB'
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch departments
      const deptResponse = await fetch('/api/departments');
      const deptData = await deptResponse.json();
      
      // Fetch HOD candidates
      const userResponse = await fetch('/api/users');
      const userData = await userResponse.json();

      if (deptResponse.ok && deptData.status === 'success') {
        setDepts(deptData.data);
      } else {
        setError(deptData.message || 'Failed to fetch departments.');
      }

      if (userResponse.ok && userData.status === 'success') {
        setUsers(userData.data);
      }
    } catch (err) {
      setError('Connection failure: Unable to fetch data from API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRowClick = (d) => {
    setEditingDeptId(d.id);
    setForm({
      code: d.code || '',
      name: d.name || '',
      hod: d.hod || 'Unassigned',
      established: d.established || new Date().getFullYear(),
      status: d.status || 'Active',
      color: d.color || '#2563EB'
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleClearForm = () => {
    setEditingDeptId(null);
    setForm({
      code: '',
      name: '',
      hod: 'Unassigned',
      established: new Date().getFullYear(),
      status: 'Active',
      color: '#2563EB'
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!form.code || !form.name) {
      setFormError('Department Code and Name are required fields.');
      return;
    }

    try {
      const method = editingDeptId ? 'PATCH' : 'POST';
      const url = editingDeptId ? `/api/departments/${editingDeptId}` : '/api/departments';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setFormSuccess(editingDeptId ? 'Department details updated successfully!' : 'Department created successfully!');
        if (!editingDeptId) {
          handleClearForm();
        }
        fetchData();
      } else {
        setFormError(data.message || 'Operation failed.');
      }
    } catch (err) {
      setFormError('Failed to communicate with configuration server.');
    }
  };

  const handleDeleteDept = async (deptId) => {
    if (!window.confirm('Are you sure you want to permanently delete this department? All active batch link counts will clear.')) return;
    setFormError('');
    setFormSuccess('');

    try {
      const response = await fetch(`/api/departments/${deptId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (response.ok) {
        setFormSuccess('Department deleted successfully.');
        handleClearForm();
        fetchData();
      } else {
        setFormError(data.message || 'Failed to delete department.');
      }
    } catch (err) {
      setFormError('Failed to communicate with configuration server.');
    }
  };

  const filtered = depts.filter(d => {
    const q = search.toLowerCase();
    return (
      (!q || d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || d.hod.toLowerCase().includes(q)) &&
      (statusFilter === 'All Status' || d.status === statusFilter)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / 12));
  const toggleRow  = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const stats = [
    { label: 'Total Departments', value: depts.length, icon: Home,         iconColor: '#2563EB', iconBg: '#EFF6FF' },
    { label: 'Active Batches',    value: depts.reduce((acc, d) => acc + d.batches, 0), icon: Layers,       iconColor: '#7C3AED', iconBg: '#F5F3FF' },
    { label: 'Total Students',    value: depts.reduce((acc, d) => acc + d.students, 0), icon: Users,        iconColor: '#0891B2', iconBg: '#ECFEFF' },
    { label: 'Inactive Depts',    value: depts.filter(d => d.status === 'Inactive').length, icon: AlertTriangle, iconColor: '#D97706', iconBg: '#FFFBEB' },
  ];

  // Candidates who can be assigned as HOD
  const hodCandidates = users.filter(u => u.role === 'HOD' || u.role === 'Administrator');

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

      <Header title="Departments Directory" subtitle="BatchMinder ERP • Super Admin • Departments" setActiveNav={setActiveNav} />

      {/* ── Body Container ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '18px 24px', backgroundColor: '#F8FAFC', overflowY: 'auto' }}>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '18px' }}>
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
                  <p style={{ margin: 0, fontSize: '21px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
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

          {/* ── Left Side: Departments List ── */}
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: '13px', overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', height: '100%'
          }}>

            {/* Filter Bar */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', gap: '10px',
              backgroundColor: '#FAFAFA'
            }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={13} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by code, title, or HOD name..."
                  style={{
                    width: '100%', padding: '7px 10px 7px 30px', borderRadius: '7px',
                    border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
                  }}
                />
              </div>
              <Dropdown value={statusFilter} options={STATUS_OPTIONS} onChange={setStatus} />
            </div>

            {/* Table or States */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                  <RefreshCw size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Loading departments...</span>
                </div>
              ) : error ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                  <AlertTriangle size={28} color="#EF4444" />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{error}</p>
                    <button
                      onClick={fetchData}
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
                  <Home size={32} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>No departments found.</span>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC' }}>
                      <th style={{ width: '34px', padding: '9px 13px' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} />
                      </th>
                      {['DEPT','HOD / CHAIRPERSON','ESTABLISHED','STUDENTS','BATCHES','STATUS'].map(col => (
                        <th key={col} style={{
                          padding: '9px 10px', textAlign: 'left',
                          fontSize: '9.5px', fontWeight: 800, color: '#94A3B8',
                          letterSpacing: '0.7px', textTransform: 'uppercase', whiteSpace: 'nowrap'
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((currentPage-1)*12, currentPage*12).map((d, i) => {
                      const isSel = selected.includes(d.id) || editingDeptId === d.id;
                      const ss    = STATUS_STYLE[d.status] || STATUS_STYLE.Active;
                      return (
                        <tr
                          key={d.id}
                          onClick={() => handleRowClick(d)}
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
                            <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleRow(d.id)} style={{ cursor: 'pointer' }} />
                          </td>
                          <td style={{ padding: '9px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '7px',
                                backgroundColor: d.color, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '0.3px'
                              }}>{d.code}</div>
                              <div>
                                <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>{d.name}</p>
                                <p style={{ margin: 0, fontSize: '10px', color: '#94A3B8' }}>{d.code} Department</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '9px 10px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>{d.hod}</td>
                          <td style={{ padding: '9px 10px', fontSize: '12px', color: '#475569' }}>{d.established}</td>
                          <td style={{ padding: '9px 10px', fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>{d.students}</td>
                          <td style={{ padding: '9px 10px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>{d.batches} Batches</td>
                          <td style={{ padding: '9px 10px' }}>
                            <span style={{
                              padding: '2px 9px', borderRadius: '18px',
                              fontSize: '10px', fontWeight: 700,
                              backgroundColor: ss.bg, color: ss.color,
                              border: `1px solid ${ss.border}`, whiteSpace: 'nowrap'
                            }}>{d.status}</span>
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
                Showing {filtered.length === 0 ? 0 : (currentPage-1)*12 + 1}–{Math.min(currentPage*12, filtered.length)} of {filtered.length} departments
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

          {/* ── Right panel: Config form ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>

            {/* Department Form */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '13px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '13px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {editingDeptId ? <BookOpen size={13} color="#7C3AED" /> : <Plus size={13} color="#2563EB" />}
                  {editingDeptId ? 'Modify Department' : 'Create Department'}
                </h3>
                {editingDeptId && (
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
                  <label style={labelStyle}>Department Code (e.g. CS)</label>
                  <input
                    type="text"
                    required
                    disabled={editingDeptId ? true : false}
                    value={form.code}
                    onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                    style={{ ...inputStyle, textTransform: 'uppercase', backgroundColor: editingDeptId ? '#F1F5F9' : '#FFFFFF' }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Full Department Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Chairperson / HOD</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.hod}
                      onChange={e => setForm(p => ({ ...p, hod: e.target.value }))}
                      style={selectStyle}
                    >
                      <option value="Unassigned">Unassigned</option>
                      {hodCandidates.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Established Year</label>
                  <input
                    type="number"
                    required
                    value={form.established}
                    onChange={e => setForm(p => ({ ...p, established: Number(e.target.value) }))}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Status</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.status}
                      onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                      style={selectStyle}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Visual Accent Color</label>
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                    style={{ width: '100%', height: '36px', padding: '2px', border: '1px solid #E2E8F0', borderRadius: '7px', cursor: 'pointer', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%', marginTop: '6px', padding: '9px',
                    borderRadius: '8px', border: 'none',
                    backgroundColor: editingDeptId ? '#7C3AED' : '#2563EB', color: '#fff',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    fontFamily: 'inherit', transition: 'filter 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(90%)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'brightness(100%)'}
                >
                  <Check size={13} /> {editingDeptId ? 'Save Changes' : 'Create Department'}
                </button>
              </form>

              {editingDeptId && (
                <button
                  onClick={() => handleDeleteDept(editingDeptId)}
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
                  <Trash2 size={12} /> Delete Department
                </button>
              )}
            </div>

            {/* Quick Helper */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '13px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              flex: 1, display: 'flex', flexDirection: 'column'
            }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#0F172A', flexShrink: 0 }}>
                HOD Directory
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: '11.5px', color: '#94A3B8' }}>List of current academic leadership candidates in the system.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                {hodCandidates.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '5px', backgroundColor: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff' }}>{c.initials}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{c.name}</p>
                      <p style={{ margin: 0, fontSize: '9.5px', color: '#94A3B8' }}>{c.role} • {c.dept}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
