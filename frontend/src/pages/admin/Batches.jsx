import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit3, Trash2, Users, X, User } from 'lucide-react';
import Select from 'react-select';
import { useModal } from '../../contexts/ModalContext';

export default function Batches() {
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

  const resetForm = () => {
    setForm({ code: '', departmentId: '', startYear: new Date().getFullYear(), advisor: 'Unassigned' });
    setEditing(null);
  };

  const openEdit = (batch) => {
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
    if (!form.code.trim() || !form.departmentId) return;
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
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
          backgroundColor: '#0F172A', color: '#fff', border: 'none', borderRadius: 10,
          fontWeight: 600, fontSize: 13, cursor: 'pointer'
        }}>
          <Plus size={16} /> New Batch
        </button>
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
              <button onClick={() => setShowForm(false)} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E2E8F0',
                backgroundColor: '#fff', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                backgroundColor: '#0F172A', color: '#fff', fontWeight: 600, fontSize: 13,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
              }}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading batches...</div>
      ) : batches.length === 0 ? (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94A3B8' }}>No batches found. Create your first batch.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map(b => (
            <div key={b._id} style={{
              backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
              padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={16} color="#2E75B6" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{b.code}</h3>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={13} color="#94A3B8" /> {b.advisor && b.advisor !== 'Unassigned' ? `Advisor: ${b.advisor}` : 'No Advisor Assigned'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(b)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', backgroundColor: '#F1F5F9', cursor: 'pointer', color: '#64748B' }}><Edit3 size={14} /></button>
                  <button onClick={() => handleDelete(b._id)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', backgroundColor: '#FFF1F2', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>Start Year <strong style={{ color: '#0F172A' }}>{b.startYear}</strong></span>
                <span style={{ color: '#64748B' }}>Status <strong style={{ color: b.status === 'Allocated' ? '#16A34A' : '#94A3B8' }}>{b.status}</strong></span>
              </div>
              <div style={{ padding: '6px 10px', borderRadius: 6, backgroundColor: '#F8FAFC', fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={14} color="#94A3B8" /> {b.dept || 'N/A'} — {b.studentCount || 0} students
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
