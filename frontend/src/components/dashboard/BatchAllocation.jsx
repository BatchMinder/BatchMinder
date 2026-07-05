import React, { useState, useEffect } from 'react';
import {
  Search, ChevronDown, Plus, Bell, AlertTriangle,
  Users, UserCheck, Layers, Check, Calendar, Trash2, X, RefreshCw
} from 'lucide-react';
import Header from './Header';
import { useDepartments } from '../../hooks/useDepartments';

const ALLOCATION_OPTIONS = ['All Status', 'Allocated', 'Unassigned'];

const STATUS_STYLE = {
  Allocated:  { bg: '#DCFCE7', color: '#15803D', border: '#BBF7D0' },
  Pending:    { bg: '#FEF9C3', color: '#A16207', border: '#FDE68A' },
  Unassigned: { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' }
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

export default function BatchAllocation({ setActiveNav }) {
  const { departments, isLoading: deptsLoading } = useDepartments();

  const [batches, setBatches]       = useState([]);
  const [advisors, setAdvisors]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [search, setSearch]         = useState('');
  const [deptFilter, setDept]       = useState('All Departments');
  const [allocFilter, setAlloc]     = useState('All Status');
  const [currentPage, setPage]      = useState(1);

  // Form State
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [form, setForm] = useState({
    code: '',
    dept: '',
    advisor: 'Unassigned',
    status: 'Unassigned',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const DEPT_OPTIONS = ['All Departments', ...departments.map(d => d.name)];

  useEffect(() => {
    if (!editingBatchId && departments.length > 0 && !form.dept) {
      setForm(prev => ({ ...prev, dept: departments[0].name }));
    }
  }, [departments, editingBatchId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const batchResponse = await fetch('/api/batches');
      const batchData = await batchResponse.json();

      const userResponse = await fetch('/api/users');
      const userData = await userResponse.json();

      if (batchResponse.ok && batchData.status === 'success') {
        setBatches(batchData.data);
      } else {
        setError(batchData.message || 'Failed to retrieve batches.');
      }

      if (userResponse.ok && userData.status === 'success') {
        // Filter users to get advisor candidates
        const advisorList = userData.data.filter(u => u.role === 'Batch Advisor');
        setAdvisors(advisorList);
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

  const handleRowClick = (b) => {
    setEditingBatchId(b.id);
    setForm({
      code: b.code || '',
      dept: b.dept || '',
      advisor: b.advisor || 'Unassigned',
      status: b.status || 'Unassigned',
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleClearForm = () => {
    setEditingBatchId(null);
    setForm({
      code: '',
      dept: departments.length > 0 ? departments[0].name : '',
      advisor: 'Unassigned',
      status: 'Unassigned',
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!form.code) {
      setFormError('Batch Code is required.');
      return;
    }

    try {
      const method = editingBatchId ? 'PATCH' : 'POST';
      const url = editingBatchId ? `/api/batches/${editingBatchId}` : '/api/batches';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setFormSuccess(editingBatchId ? 'Batch details updated successfully!' : 'Batch created successfully!');
        if (!editingBatchId) {
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

  const handleInlineAdvisorChange = async (batchId, newAdvisorName) => {
    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advisor: newAdvisorName })
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update advisor inline:', err);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm('Are you sure you want to permanently delete this academic batch?')) return;
    setFormError('');
    setFormSuccess('');

    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (response.ok) {
        setFormSuccess('Batch deleted successfully.');
        handleClearForm();
        fetchData();
      } else {
        setFormError(data.message || 'Failed to delete batch.');
      }
    } catch (err) {
      setFormError('Failed to communicate with configuration server.');
    }
  };

  const filtered = batches.filter(b => {
    const q = search.toLowerCase();
    const isAllocated = b.advisor && b.advisor !== 'Unassigned';
    return (
      (!q || b.code.toLowerCase().includes(q) || b.dept.toLowerCase().includes(q) || b.advisor.toLowerCase().includes(q)) &&
      (deptFilter === 'All Departments' || b.dept === deptFilter) &&
      (allocFilter === 'All Status' || (allocFilter === 'Allocated' && isAllocated) || (allocFilter === 'Unassigned' && !isAllocated))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / 12));
  const toggleRow  = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const stats = [
    { label: 'Total Batches',      value: batches.length, icon: Layers,       iconColor: '#2563EB', iconBg: '#EFF6FF' },
    { label: 'Allocated Batches',  value: batches.filter(b => b.advisor && b.advisor !== 'Unassigned').length, icon: UserCheck,    iconColor: '#7C3AED', iconBg: '#F5F3FF' },
    { label: 'Unassigned Batches', value: batches.filter(b => !b.advisor || b.advisor === 'Unassigned').length, icon: AlertTriangle, iconColor: '#D97706', iconBg: '#FFFBEB' },
    { label: 'Total Students',     value: batches.reduce((acc, b) => acc + b.students, 0), icon: Users,        iconColor: '#0891B2', iconBg: '#ECFEFF' },
  ];

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

      <Header title="Academic Batch Allocation" subtitle="BatchMinder ERP • Super Admin • Batches" setActiveNav={setActiveNav} />

      {/* ── Scrollable Body ── */}
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

          {/* ── Left Side: Batches List ── */}
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
                  placeholder="Search by batch code, department, or advisor name..."
                  style={{
                    width: '100%', padding: '7px 10px 7px 30px', borderRadius: '7px',
                    border: '1px solid #E2E8F0', fontSize: '12px', color: '#1E293B',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
                  }}
                />
              </div>
              <Dropdown value={deptFilter} options={DEPT_OPTIONS} onChange={setDept} />
              <Dropdown value={allocFilter} options={ALLOCATION_OPTIONS} onChange={setAlloc} />
            </div>

            {/* Table or States */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                  <RefreshCw size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Loading academic batches...</span>
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
                  <Layers size={32} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>No academic batches found.</span>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC' }}>
                      <th style={{ width: '34px', padding: '9px 13px' }}>
                        <input type="checkbox" style={{ cursor: 'pointer' }} />
                      </th>
                      {['BATCH CODE','DEPARTMENT','ENROLLED STUDENTS','ASSIGNED ADVISOR','STATUS'].map(col => (
                        <th key={col} style={{
                          padding: '9px 10px', textAlign: 'left',
                          fontSize: '9.5px', fontWeight: 800, color: '#94A3B8',
                          letterSpacing: '0.7px', textTransform: 'uppercase', whiteSpace: 'nowrap'
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((currentPage-1)*12, currentPage*12).map((b, i) => {
                      const isSel = selected.includes(b.id) || editingBatchId === b.id;
                      const isAlloc = b.advisor && b.advisor !== 'Unassigned';
                      const ss = STATUS_STYLE[isAlloc ? 'Allocated' : 'Unassigned'];
                      return (
                        <tr
                          key={b.id}
                          onClick={() => handleRowClick(b)}
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
                            <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggleRow(b.id)} style={{ cursor: 'pointer' }} />
                          </td>
                          <td style={{ padding: '9px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Layers size={15} color="#64748B" />
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{b.code}</span>
                            </div>
                          </td>
                          <td style={{ padding: '9px 10px', fontSize: '12px', color: '#475569' }}>{b.dept}</td>
                          <td style={{ padding: '9px 10px', fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>{b.students} Students</td>
                          <td style={{ padding: '6px 10px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ position: 'relative', width: '170px' }}>
                              <select
                                value={b.advisor}
                                onChange={e => handleInlineAdvisorChange(b.id, e.target.value)}
                                style={{
                                  width: '100%', padding: '5px 22px 5px 8px', borderRadius: '6px',
                                  border: '1px solid #CBD5E1', fontSize: '11.5px', color: '#1E293B',
                                  appearance: 'none', cursor: 'pointer', outline: 'none',
                                  fontFamily: 'inherit', fontWeight: 600,
                                  backgroundColor: 'rgba(37,99,235,0.03)'
                                }}
                              >
                                <option value="Unassigned">Unassigned</option>
                                {advisors.map(a => (
                                  <option key={a.id} value={a.name}>{a.name}</option>
                                ))}
                              </select>
                              <ChevronDown size={11} color="#64748B" style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            </div>
                          </td>
                          <td style={{ padding: '9px 10px' }}>
                            <span style={{
                              padding: '2px 9px', borderRadius: '18px',
                              fontSize: '10px', fontWeight: 700,
                              backgroundColor: ss.bg, color: ss.color,
                              border: `1px solid ${ss.border}`, whiteSpace: 'nowrap'
                            }}>{isAlloc ? 'Allocated' : 'Unassigned'}</span>
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
                Showing {filtered.length === 0 ? 0 : (currentPage-1)*12 + 1}–{Math.min(currentPage*12, filtered.length)} of {filtered.length} batches
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

            {/* Batch Form */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '13px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '13px' }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {editingBatchId ? <Layers size={13} color="#7C3AED" /> : <Plus size={13} color="#2563EB" />}
                  {editingBatchId ? 'Modify Batch' : 'Create Academic Batch'}
                </h3>
                {editingBatchId && (
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
                  <label style={labelStyle}>Batch Code (e.g. BSCS-2024)</label>
                  <input
                    type="text"
                    required
                    disabled={editingBatchId ? true : false}
                    value={form.code}
                    onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                    style={{ ...inputStyle, textTransform: 'uppercase', backgroundColor: editingBatchId ? '#F1F5F9' : '#FFFFFF' }}
                  />
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

                <div>
                  <label style={labelStyle}>Assign Advisor</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={form.advisor}
                      onChange={e => setForm(p => ({ ...p, advisor: e.target.value }))}
                      style={selectStyle}
                    >
                      <option value="Unassigned">Unassigned</option>
                      {advisors.map(a => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} color="#94A3B8" style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

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
                    backgroundColor: departments.length === 0 ? '#CBD5E1' : (editingBatchId ? '#7C3AED' : '#2563EB'),
                    color: departments.length === 0 ? '#94A3B8' : '#fff',
                    fontSize: '12px', fontWeight: 700, cursor: departments.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    fontFamily: 'inherit', transition: 'filter 0.15s'
                  }}
                  onMouseEnter={e => { if (departments.length > 0) e.currentTarget.style.filter = 'brightness(90%)'; }}
                  onMouseLeave={e => { if (departments.length > 0) e.currentTarget.style.filter = 'brightness(100%)'; }}
                >
                  <Check size={13} /> {editingBatchId ? 'Save Advisor Allocation' : 'Create Batch'}
                </button>
              </form>

              {editingBatchId && (
                <button
                  onClick={() => handleDeleteBatch(editingBatchId)}
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
                  <Trash2 size={12} /> Delete Batch
                </button>
              )}
            </div>

            {/* Quick Advisor Helper */}
            <div style={{
              backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '13px', padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              flex: 1, display: 'flex', flexDirection: 'column'
            }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#0F172A', flexShrink: 0 }}>
                Advisors List
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: '11.5px', color: '#94A3B8' }}>List of current batch advisor candidates in the system.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                {advisors.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #F1F5F9' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '5px', backgroundColor: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff' }}>{a.initials}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{a.name}</p>
                      <p style={{ margin: 0, fontSize: '9.5px', color: '#94A3B8' }}>Dept: {a.dept}</p>
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
