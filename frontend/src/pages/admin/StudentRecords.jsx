import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Eye, X, User, Award, Mail, BookOpen, AlertCircle } from 'lucide-react';
import { CircularProgress } from '@mui/material';

export default function StudentRecords() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cgpaFilter, setCgpaFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ rollNumber: '', name: '', email: '', departmentId: '', batchId: '', cgpa: '' });
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const limit = 25;

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (cgpaFilter) params.append('cgpaStatus', cgpaFilter);

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

  useEffect(() => { fetchStudents(); }, [page, search, statusFilter, cgpaFilter]);

  useEffect(() => {
    fetch('/api/batches').then(r => r.json()).then(d => { if (d.status === 'success') setBatches(d.data); }).catch(() => {});
    fetch('/api/departments').then(r => r.json()).then(d => { if (d.status === 'success') setDepartments(d.data); }).catch(() => {});
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
        fetchStudents();
      } else {
        alert(data.message || 'Failed to create student');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (s) => {
    if (s.cgpaStatus === 'critical') return { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Critical' };
    if (s.cgpaStatus === 'warning') return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Warning' };
    return { bg: 'bg-green-50 text-green-700 border-green-200', label: 'Good' };
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            backgroundColor: '#0F172A', color: '#fff', border: 'none', borderRadius: 10,
            fontWeight: 600, fontSize: 13, cursor: 'pointer'
          }}
        >
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center">
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            placeholder="Search by name or ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }}
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, backgroundColor: '#fff' }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={cgpaFilter} onChange={e => { setCgpaFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, backgroundColor: '#fff' }}>
          <option value="">All CGPA</option>
          <option value="good">Good</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Roll Number</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Batch</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}><CircularProgress size={16} /> Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#EF4444' }}>{error}</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No students found</td></tr>
            ) : students.map(s => {
              const badge = statusBadge(s);
              return (
                <tr key={s._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>{s.rollNumber}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{s.name}</div>
                    {s.email && <div style={{ fontSize: 11, color: '#94A3B8' }}>{s.email}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>{s.batchId?.code || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', color: '#64748B' }}>Sem {s.currentSemester}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A' }}>{s.cgpa.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      backgroundColor: s.status === 'active' ? '#F0FDF4' : '#F1F5F9',
                      color: s.status === 'active' ? '#16A34A' : '#94A3B8',
                      border: `1px solid ${s.status === 'active' ? '#BBF7D0' : '#E2E8F0'}`
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, ...badge.bg.split(' ').reduce((acc, cls) => { if (cls.startsWith('bg-')) acc.backgroundColor = cls.replace('bg-', ''); return acc; }, {}) }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => setSelected(s)} style={{ padding: '6px', border: 'none', backgroundColor: 'transparent', color: '#2E75B6', cursor: 'pointer' }}>
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #E2E8F0', backgroundColor: '#FAFAFA', fontSize: 13 }}>
            <span style={{ color: '#64748B' }}>Page {page} of {totalPages} ({total} total)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', backgroundColor: '#fff', fontWeight: 600, cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page > 1 ? 1 : 0.5, fontSize: 13 }}>Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', backgroundColor: '#fff', fontWeight: 600, cursor: page < totalPages ? 'pointer' : 'not-allowed', opacity: page < totalPages ? 1 : 0.5, fontSize: 13 }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
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
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Batch</div>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 4 }}>{selected.batchId?.code || 'N/A'}</div>
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
            {selected.cgpaStatus !== 'good' && (
              <div style={{ padding: 12, borderRadius: 8, backgroundColor: selected.cgpaStatus === 'critical' ? '#FFF1F2' : '#FFFBEB', border: `1px solid ${selected.cgpaStatus === 'critical' ? '#FECACA' : '#FDE68A'}`, display: 'flex', gap: 8, fontSize: 13, color: selected.cgpaStatus === 'critical' ? '#B91C1C' : '#92400E' }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div><strong>Academic Alert:</strong> This student's CGPA status is <strong>{selected.cgpaStatus}</strong>.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Student Form */}
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
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Name *</label>
                  <input required value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Department *</label>
                    <select required value={formData.departmentId} onChange={e => setFormData(f => ({ ...f, departmentId: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, backgroundColor: '#fff', outline: 'none' }}>
                      <option value="">Select...</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Batch *</label>
                    <select required value={formData.batchId} onChange={e => setFormData(f => ({ ...f, batchId: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, backgroundColor: '#fff', outline: 'none' }}>
                      <option value="">Select...</option>
                      {batches.map(b => <option key={b._id} value={b._id}>{b.code}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>CGPA</label>
                  <input type="number" step="0.01" min="0" max="4" value={formData.cgpa} onChange={e => setFormData(f => ({ ...f, cgpa: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: '8px 20px', borderRadius: 10, border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ padding: '8px 20px', borderRadius: 10, border: 'none', backgroundColor: '#0F172A', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
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
