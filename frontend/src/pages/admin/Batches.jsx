import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit3, Trash2, Users, X, User, Info } from 'lucide-react';
import Select from 'react-select';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';

export default function Batches({ setActiveNav }) {
  const { user } = useAuth();
  const canManageBatches = user?.role === 'dean';
  const { showConfirm, showAlert, showSuccess } = useModal();
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', departmentId: '', startYear: new Date().getFullYear(), advisor: 'Unassigned' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Batch Students Modal State
  const [selectedBatchForModal, setSelectedBatchForModal] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loadingBatchStudents, setLoadingBatchStudents] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/batches').then(r => r.json()),
      fetch('/api/departments').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([b, d, u]) => {
      if (b.status === 'success') setBatches(b.data || []);
      if (d.status === 'success') setDepartments(d.data || []);
      if (u.status === 'success') setUsers(u.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleViewStudents = async (batch) => {
    setSelectedBatchForModal(batch);
    setLoadingBatchStudents(true);
    try {
      const res = await fetch(`/api/students?batchId=${batch._id || batch.id}&limit=100`);
      const data = await res.json();
      if (data.status === 'success') {
        setBatchStudents(data.data?.students || data.students || []);
      } else {
        setBatchStudents([]);
      }
    } catch (err) {
      console.error('Failed to fetch batch students:', err);
      setBatchStudents([]);
    } finally {
      setLoadingBatchStudents(false);
    }
  };

  const resetForm = () => {
    setForm({ code: '', departmentId: '', startYear: new Date().getFullYear(), advisor: 'Unassigned' });
    setEditing(null);
  };

  const openEdit = (batch) => {
    if (!canManageBatches) return;
    setForm({
      code: batch.code,
      departmentId: batch.departmentId?._id || batch.departmentId || '',
      startYear: batch.startYear,
      advisor: batch.advisorId || batch.advisor || 'Unassigned',
    });
    setEditing(batch._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!canManageBatches || !form.code.trim() || !form.departmentId) return;
    setSaving(true);
    try {
      const url = editing ? `/api/batches/${editing}` : '/api/batches';
      const method = editing ? 'PATCH' : 'POST';
      const bodyToSend = {
        code: form.code,
        departmentId: form.departmentId,
        startYear: form.startYear,
        advisor: form.advisor === 'Unassigned' ? 'Unassigned' : undefined,
        advisorId: form.advisor !== 'Unassigned' ? form.advisor : null
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyToSend)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        showSuccess(editing ? 'Batch updated successfully.' : 'Batch created successfully.');
        resetForm();
        setShowForm(false);
        const r = await fetch('/api/batches');
        const d = await r.json();
        if (d.status === 'success') setBatches(d.data || []);
      } else {
        alert(data.message || 'Save failed');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManageBatches) return;
    const confirmed = await showConfirm(
      'Delete Batch',
      'Delete this batch? This action cannot be undone.',
      'Delete',
      'Cancel',
      '#EF4444'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/batches/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Batch deleted successfully.');
        setBatches(b => b.filter(x => x._id !== id));
      } else {
        const d = await res.json();
        alert(d.message || 'Delete failed');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const deptOpts = departments.map(d => ({ value: d._id, label: d.name }));
  const advisors = users.filter(u => u.role === 'Batch Advisor');
  const advisorOpts = [
    { value: 'Unassigned', label: 'Unassigned' },
    ...advisors.map(a => ({ value: a.id || a._id, label: a.name }))
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ padding: '10px 16px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#1E40AF', fontWeight: 500, flex: 1, marginRight: canManageBatches ? 16 : 0 }}>
          <Info size={18} color="#2563EB" />
          <span>Viewing Computer Science department batches, student enrollment counts, and assigned batch advisors. Click any batch to view its enrolled students.</span>
        </div>

        {canManageBatches && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
              transition: 'all 0.15s ease', whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.2)'; }}
          >
            <Plus size={16} /> New Batch
          </button>
        )}
      </div>

      {success && (
        <div style={{ padding: 12, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: '#166534' }}>
          Batch saved successfully.
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, width: 480, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{editing ? 'Edit Batch' : 'New Batch'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Batch Code</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. BSCS-2022" style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</label>
                <Select
                  options={deptOpts}
                  value={deptOpts.find(o => o.value === form.departmentId) || null}
                  onChange={o => setForm(f => ({ ...f, departmentId: o?.value || '' }))}
                  placeholder="Select department"
                  styles={{
                    control: (base) => ({ ...base, borderRadius: 8, borderColor: '#E2E8F0', minHeight: 40 }),
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Advisor</label>
                <Select
                  options={advisorOpts}
                  value={advisorOpts.find(o => o.value === form.advisor) || advisorOpts.find(o => o.label === form.advisor) || { value: 'Unassigned', label: 'Unassigned' }}
                  onChange={o => setForm(f => ({ ...f, advisor: o?.value || 'Unassigned' }))}
                  placeholder="Select advisor"
                  styles={{
                    control: (base) => ({ ...base, borderRadius: 8, borderColor: '#E2E8F0', minHeight: 40 }),
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Start Year</label>
                <input type="number" value={form.startYear} onChange={e => setForm(f => ({ ...f, startYear: Number(e.target.value) }))} min={2000} max={2100} style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff',
                  fontWeight: 700, fontSize: 13,
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                  transition: 'all 0.15s'
                }}
              >
                {saving ? 'Saving...' : editing ? 'Update Batch' : 'Create Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading batches...</div>
      ) : batches.length === 0 ? (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94A3B8' }}>No batches found.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map(b => (
            <div key={b._id} style={{
              backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
              padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={16} color="#2563EB" />
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{b.code}</h3>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={13} color="#94A3B8" /> {b.advisor && b.advisor !== 'Unassigned' ? `Advisor: ${b.advisor}` : 'No Advisor Assigned'}
                    </div>
                  </div>
                  {canManageBatches && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(b)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', cursor: 'pointer', color: '#475569', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EFF6FF'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}><Edit3 size={14} /></button>
                      <button onClick={() => handleDelete(b._id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #FEE2E2', backgroundColor: '#FEF2F2', cursor: 'pointer', color: '#EF4444', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEE2E2'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12 }}>
                  <span style={{ color: '#64748B' }}>Start Year <strong style={{ color: '#0F172A' }}>{b.startYear}</strong></span>
                  <span style={{ color: '#64748B' }}>Status <strong style={{ color: b.status === 'Allocated' ? '#16A34A' : '#94A3B8' }}>{b.status}</strong></span>
                </div>
              </div>

              <div>
                <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: '#F8FAFC', fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} color="#94A3B8" /> {b.dept || 'CS'}
                  </span>
                  <strong style={{ color: '#2563EB', fontWeight: 700 }}>{b.studentCount || b.students || 0} Students</strong>
                </div>

                <button
                  onClick={() => handleViewStudents(b)}
                  style={{
                    width: '100%', padding: '9px 14px',
                    backgroundColor: '#EFF6FF', color: '#2563EB',
                    border: '1px solid #BFDBFE', borderRadius: '10px',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2563EB'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; }}
                >
                  <Users size={14} /> Show Batch Students ({b.studentCount || b.students || 0})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Batch Enrolled Students Modal */}
      {selectedBatchForModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '740px', maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                    {selectedBatchForModal.code}
                  </span>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Batch Enrolled Students</h2>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Department: <strong>{selectedBatchForModal.dept || 'Computer Science'}</strong> • Advisor: <strong>{selectedBatchForModal.advisor || 'Unassigned'}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedBatchForModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
              {loadingBatchStudents ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '13px' }}>Loading enrolled students...</div>
              ) : batchStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '13px' }}>No students currently enrolled in this batch.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600, textAlign: 'left' }}>
                      <th style={{ padding: '10px 8px' }}>ROLL NUMBER</th>
                      <th style={{ padding: '10px 8px' }}>NAME</th>
                      <th style={{ padding: '10px 8px' }}>EMAIL</th>
                      <th style={{ padding: '10px 8px' }}>SEMESTER</th>
                      <th style={{ padding: '10px 8px' }}>CGPA</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchStudents.map(s => (
                      <tr key={s._id || s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 700, color: '#2563EB' }}>{s.rollNumber || s.studentID}</td>
                        <td style={{ padding: '10px 8px', color: '#0F172A', fontWeight: 600 }}>{s.name || s.studentName}</td>
                        <td style={{ padding: '10px 8px', color: '#64748B', fontSize: '12px' }}>{s.email}</td>
                        <td style={{ padding: '10px 8px', color: '#64748B' }}>Semester {s.currentSemester || s.semester || 1}</td>
                        <td style={{ padding: '10px 8px', fontWeight: 700, color: (s.cgpa || 0) >= 3.0 ? '#10B981' : (s.cgpa || 0) >= 2.0 ? '#F59E0B' : '#EF4444' }}>
                          {s.cgpa ? Number(s.cgpa).toFixed(2) : 'N/A'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, backgroundColor: s.status === 'active' ? '#D1FAE5' : '#FEF3C7', color: s.status === 'active' ? '#059669' : '#D97706' }}>
                            {(s.status || 'active').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Total Enrolled: <strong style={{ color: '#0F172A' }}>{batchStudents.length} Students</strong>
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                {setActiveNav && (
                  <button
                    onClick={() => { setSelectedBatchForModal(null); setActiveNav('students'); }}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #DBEAFE', backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Open in Student Directory
                  </button>
                )}
                <button
                  onClick={() => setSelectedBatchForModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

