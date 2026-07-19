import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, AlertTriangle, ShieldCheck, ShieldAlert,
  Search, RefreshCw, GraduationCap, BookOpen, Eye, X,
  Clock, Mail, ChevronRight
} from 'lucide-react';

export default function AdvisorMyBatch({ selectedBatch }) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const assignedBatches = user?.assignedBatchIds || [];
  const hasNoBatches = assignedBatches.length === 0;

  // --- Fetch students in assigned batch(es) ---
  const fetchStudents = async () => {
    if (hasNoBatches) return;
    setLoading(true);
    try {
      let url = `/api/advisor/students?page=${page}&limit=15`;
      if (selectedBatch && selectedBatch !== 'all') url += `&batchId=${selectedBatch}`;
      if (statusFilter) url += `&cgpaStatus=${statusFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setStudents(data.data.students || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch batch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, [selectedBatch, statusFilter, searchQuery, page]);
  useEffect(() => { setPage(1); }, [selectedBatch, statusFilter, searchQuery]);

  // --- Open student profile detail ---
  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/advisor/students/${id}`);
      const data = await res.json();
      if (res.ok && data.status === 'success') setSelectedStudent(data.data.student);
    } catch (err) {
      console.error('Failed to load student detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Derived stats from current page (totals from API)
  const goodCount = students.filter(s => s.cgpaStatus === 'good').length;
  const warningCount = students.filter(s => s.cgpaStatus === 'warning').length;
  const criticalCount = students.filter(s => s.cgpaStatus === 'critical').length;

  const statusBadge = (status) => {
    const map = {
      good: { label: 'Good', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
      warning: { label: 'Warning', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
      critical: { label: 'Critical', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
    };
    const cfg = map[status] || { label: status || 'N/A', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' };
    return (
      <span style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
        fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px',
        color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`
      }}>
        {cfg.label}
      </span>
    );
  };

  if (hasNoBatches) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
        <AlertTriangle size={44} color="#EF4444" style={{ display: 'block', margin: '0 auto 14px' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 800, color: '#1E293B' }}>No Batches Assigned</h3>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>Contact your Dean to get assigned to your academic batches.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Advisor Portal
          </p>
          <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            My Batch
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
            Students assigned to your batches — view academic records and CGPA status
          </p>
        </div>
        <button onClick={fetchStudents} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
          borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#fff',
          fontSize: '12px', fontWeight: 700, color: '#475569', cursor: 'pointer'
        }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: totalCount, color: '#2563EB', bg: '#EFF6FF', icon: Users },
          { label: 'Good Standing', value: loading ? '...' : goodCount, color: '#16A34A', bg: '#F0FDF4', icon: ShieldCheck },
          { label: 'Warning', value: loading ? '...' : warningCount, color: '#D97706', bg: '#FFFBEB', icon: AlertTriangle },
          { label: 'Critical', value: loading ? '...' : criticalCount, color: '#DC2626', bg: '#FEF2F2', icon: ShieldAlert }
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} style={{
            backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px',
            padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={17} color={color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
              <h3 style={{ margin: '2px 0 0', fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px',
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '360px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search name or roll number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px',
              border: '1px solid #E2E8F0', fontSize: '12px', outline: 'none',
              backgroundColor: '#F8FAFC', color: '#1E293B', fontFamily: 'inherit', boxSizing: 'border-box'
            }}
          />
        </div>
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0',
            fontSize: '12px', fontWeight: 700, color: '#1E293B', outline: 'none',
            backgroundColor: '#F8FAFC', cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          <option value="">All Statuses</option>
          <option value="good">Good Standing</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>
          {totalCount} students
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Table Header */}
          <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
          padding: '12px 20px',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px'
        }}>
          <span>Student</span>
          <span>Roll Number</span>
          <span>Batch</span>
          <span>Semester</span>
          <span>CGPA / Status</span>
          <span style={{ textAlign: 'center' }}>Action</span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>
            <RefreshCw size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <Users size={36} color="#CBD5E1" style={{ display: 'block', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#475569' }}>No Students Found</p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94A3B8' }}>
              {searchQuery || statusFilter ? 'Try clearing the filters above.' : 'No students are enrolled in your assigned batches yet.'}
            </p>
          </div>
        ) : (
          <>
            {students.map((s, idx) => (
              <div
                key={s._id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
                  padding: '14px 20px',
                  borderBottom: idx < students.length - 1 ? '1px solid #F1F5F9' : 'none',
                  alignItems: 'center',
                  transition: 'background-color 0.12s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {/* Name + Email */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                    backgroundColor: s.cgpaStatus === 'critical' ? '#FEE2E2' : s.cgpaStatus === 'warning' ? '#FEF3C7' : '#EFF6FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 800,
                    color: s.cgpaStatus === 'critical' ? '#DC2626' : s.cgpaStatus === 'warning' ? '#D97706' : '#2563EB'
                  }}>
                    {(s.name || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{s.name || '—'}</p>
                    <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Mail size={9} /> {s.email || '—'}
                    </p>
                  </div>
                </div>

                {/* Roll Number */}
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', fontFamily: 'monospace' }}>
                  {s.rollNumber || '—'}
                </span>

                {/* Batch */}
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  {s.batchId?.code || s.batch || '—'}
                </span>

                {/* Semester */}
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  {s.currentSemester ? `Sem ${s.currentSemester}` : '—'}
                </span>

                {/* CGPA + Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                    {s.cgpa != null ? Number(s.cgpa).toFixed(2) : '—'}
                  </span>
                  {statusBadge(s.cgpaStatus)}
                </div>

                {/* View Button */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => openDetail(s._id)}
                    style={{
                      padding: '8px 16px', borderRadius: '8px',
                      backgroundColor: '#2563EB', border: 'none',
                      fontSize: '12px', fontWeight: 600, color: '#ffffff',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                      transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(37,99,235,0.15)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1D4ED8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#2563EB'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <Eye size={14} /> View
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '7px 16px', borderRadius: '8px', border: '1px solid #E2E8F0',
              backgroundColor: page === 1 ? '#F8FAFC' : '#fff',
              fontSize: '12px', fontWeight: 700, color: page === 1 ? '#CBD5E1' : '#475569',
              cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
            }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '7px 16px', borderRadius: '8px', border: '1px solid #E2E8F0',
              backgroundColor: page === totalPages ? '#F8FAFC' : '#fff',
              fontSize: '12px', fontWeight: 700, color: page === totalPages ? '#CBD5E1' : '#475569',
              cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Student Detail Modal */}
      {(selectedStudent || detailLoading) && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px'
        }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedStudent(null); }}
        >
          <div style={{
            backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '560px',
            maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
          }}>
            {detailLoading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                Loading profile...
              </div>
            ) : selectedStudent ? (
              <>
                {/* Modal Header */}
                <div style={{
                  padding: '20px 24px', borderBottom: '1px solid #F1F5F9',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '50%',
                      backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#2563EB'
                    }}>
                      {(selectedStudent.name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                        {selectedStudent.name}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                        {selectedStudent.rollNumber} &bull; {selectedStudent.batchId?.code || selectedStudent.batch || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} style={{
                    border: 'none', backgroundColor: '#F1F5F9', borderRadius: '8px',
                    padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                  }}>
                    <X size={16} color="#64748B" />
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {/* CGPA + Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #F1F5F9' }}>
                      <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA</p>
                      <h3 style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>
                        {selectedStudent.cgpa != null ? Number(selectedStudent.cgpa).toFixed(2) : '—'}
                      </h3>
                    </div>
                    <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #F1F5F9' }}>
                      <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</p>
                      <div style={{ marginTop: '8px' }}>{statusBadge(selectedStudent.cgpaStatus)}</div>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { label: 'Email', value: selectedStudent.email, icon: Mail },
                      { label: 'Semester', value: selectedStudent.currentSemester ? `Semester ${selectedStudent.currentSemester}` : '—', icon: BookOpen },
                      { label: 'Department', value: selectedStudent.departmentId?.name || selectedStudent.department || '—', icon: GraduationCap },
                      { label: 'Credit Hours', value: selectedStudent.courses?.length ? selectedStudent.courses.reduce((sum, c) => sum + (Number(c.creditHours) || 0), 0) : '—', icon: Clock }
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                        <Icon size={13} color="#94A3B8" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 700, color: '#334155', wordBreak: 'break-all' }}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Enrolled Courses */}
                  {selectedStudent.courses && selectedStudent.courses.length > 0 && (
                    <div>
                      <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Enrolled Courses ({selectedStudent.courses.length})
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                        {selectedStudent.courses.map((c, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', backgroundColor: '#F8FAFC', borderRadius: '8px',
                            border: '1px solid #F1F5F9', fontSize: '12px'
                          }}>
                            <div>
                              <span style={{ fontWeight: 700, color: '#334155' }}>{c.courseCode}</span>
                              <span style={{ color: '#64748B', marginLeft: '8px' }}>{c.courseTitle}</span>
                            </div>
                            {c.grade && (
                              <span style={{ fontWeight: 800, color: '#2563EB', fontSize: '11px' }}>
                                Grade: {c.grade}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
