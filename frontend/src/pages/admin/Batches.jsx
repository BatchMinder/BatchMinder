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
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="p-2.5 sm:px-4 sm:py-2.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm text-blue-900 font-medium flex-1 min-w-0">
          <Info size={18} className="text-blue-600 shrink-0" />
          <span>Viewing Computer Science department batches, student enrollment counts, and assigned batch advisors. Click any batch to view its enrolled students.</span>
        </div>

        {canManageBatches && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} /> New Batch
          </button>
        )}
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 mb-4 text-xs font-medium text-green-800">
          Batch saved successfully.
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl p-5 sm:p-7 w-full max-w-md shadow-2xl animate-scaleIn border border-slate-100">
            <div className="flex justify-between items-center mb-5">
              <h2 className="m-0 text-base sm:text-lg font-bold text-slate-900">{editing ? 'Edit Batch' : 'New Batch'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Batch Code</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. BSCS-2022" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                <Select
                  options={deptOpts}
                  value={deptOpts.find(o => o.value === form.departmentId) || null}
                  onChange={o => setForm(f => ({ ...f, departmentId: o?.value || '' }))}
                  placeholder="Select department"
                  styles={{
                    control: (base) => ({ ...base, borderRadius: 8, borderColor: '#E2E8F0', minHeight: 38, fontSize: '12px' }),
                  }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Advisor</label>
                <Select
                  options={advisorOpts}
                  value={advisorOpts.find(o => o.value === form.advisor) || advisorOpts.find(o => o.label === form.advisor) || { value: 'Unassigned', label: 'Unassigned' }}
                  onChange={o => setForm(f => ({ ...f, advisor: o?.value || 'Unassigned' }))}
                  placeholder="Select advisor"
                  styles={{
                    control: (base) => ({ ...base, borderRadius: 8, borderColor: '#E2E8F0', minHeight: 38, fontSize: '12px' }),
                  }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Year</label>
                <input type="number" value={form.startYear} onChange={e => setForm(f => ({ ...f, startYear: Number(e.target.value) }))} min={2000} max={2100} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-semibold text-xs cursor-pointer hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border-none bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-xs cursor-pointer shadow-md hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving...' : editing ? 'Update Batch' : 'Create Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Cards Grid */}
      {loading ? (
        <div className="text-center py-10 text-slate-400 text-xs">Loading batches...</div>
      ) : batches.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs">No batches found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {batches.map(b => (
            <div key={b._id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between overflow-hidden min-w-0">
              <div>
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Layers size={16} className="text-blue-600 shrink-0" />
                      <h3 className="m-0 text-base font-bold text-slate-900 truncate">{b.code}</h3>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 min-w-0">
                      <User size={13} className="text-slate-400 shrink-0" /> 
                      <span className="truncate">{b.advisor && b.advisor !== 'Unassigned' ? `Advisor: ${b.advisor}` : 'No Advisor Assigned'}</span>
                    </div>
                  </div>
                  {canManageBatches && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(b)} className="p-1.5 sm:px-2 sm:py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 text-slate-600 transition-colors"><Edit3 size={14} /></button>
                      <button onClick={() => handleDelete(b._id)} className="p-1.5 sm:px-2 sm:py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs">
                  <span className="text-slate-500">Start Year <strong className="text-slate-900">{b.startYear}</strong></span>
                  <span className="text-slate-500">Status <strong className={b.status === 'Allocated' ? 'text-green-600 font-bold' : 'text-slate-400'}>{b.status}</strong></span>
                </div>
              </div>

              <div>
                {/* Department & Student Count Pill */}
                <div className="p-2 sm:px-3 sm:py-2 rounded-lg bg-slate-50 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-1.5 mb-2.5 min-w-0 overflow-hidden">
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <Users size={14} className="text-slate-400 shrink-0" /> 
                    <span className="truncate font-medium">{b.dept || 'Computer Science'}</span>
                  </span>
                  <strong className="text-blue-600 font-bold shrink-0">{b.studentCount || b.students || 0} Students</strong>
                </div>

                <button
                  onClick={() => handleViewStudents(b)}
                  className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0 overflow-hidden"
                >
                  <Users size={14} className="shrink-0" /> 
                  <span className="truncate">Show Batch Students ({b.studentCount || b.students || 0})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Batch Enrolled Students Modal */}
      {selectedBatchForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-scaleIn">
            <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3 gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase shrink-0">
                    {selectedBatchForModal.code}
                  </span>
                  <h2 className="m-0 text-base sm:text-lg font-extrabold text-slate-900 truncate">Batch Enrolled Students</h2>
                </div>
                <p className="m-0 mt-1 text-xs text-slate-500 truncate">
                  Department: <strong>{selectedBatchForModal.dept || 'Computer Science'}</strong> • Advisor: <strong>{selectedBatchForModal.advisor || 'Unassigned'}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedBatchForModal(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 thin-scrollbar">
              {loadingBatchStudents ? (
                <div className="text-center py-10 text-slate-400 text-xs">Loading enrolled students...</div>
              ) : batchStudents.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">No students currently enrolled in this batch.</div>
              ) : (
                <div className="overflow-x-auto thin-scrollbar">
                  <table className="w-full min-w-[500px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold text-left">
                        <th className="py-2.5 px-2">ROLL NUMBER</th>
                        <th className="py-2.5 px-2">NAME</th>
                        <th className="py-2.5 px-2">EMAIL</th>
                        <th className="py-2.5 px-2">SEMESTER</th>
                        <th className="py-2.5 px-2">CGPA</th>
                        <th className="py-2.5 px-2 text-right">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchStudents.map(s => (
                        <tr key={s._id || s.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-2 font-bold text-blue-600">{s.rollNumber || s.studentID}</td>
                          <td className="py-2.5 px-2 font-semibold text-slate-900">{s.name || s.studentName}</td>
                          <td className="py-2.5 px-2 text-slate-500 text-[11px]">{s.email}</td>
                          <td className="py-2.5 px-2 text-slate-500">Semester {s.currentSemester || s.semester || 1}</td>
                          <td className={`py-2.5 px-2 font-bold ${(s.cgpa || 0) >= 3.0 ? 'text-emerald-600' : (s.cgpa || 0) >= 2.0 ? 'text-amber-500' : 'text-red-500'}`}>
                            {s.cgpa ? Number(s.cgpa).toFixed(2) : 'N/A'}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {(s.status || 'active').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Total Enrolled: <strong className="text-slate-900">{batchStudents.length} Students</strong>
              </span>
              <div className="flex gap-2">
                {setActiveNav && (
                  <button
                    onClick={() => { setSelectedBatchForModal(null); setActiveNav('students'); }}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 font-semibold text-xs hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    Open in Student Directory
                  </button>
                )}
                <button
                  onClick={() => setSelectedBatchForModal(null)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
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

