import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, CheckCircle, XCircle, HelpCircle, User, Award, Sparkles, ChevronRight } from 'lucide-react';
import { CircularProgress } from '@mui/material';

export default function MigrationRecords() {
  const [migrations, setMigrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/migrations')
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setMigrations(d.data.migrations); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDecide = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const courseDecisions = Object.entries(decisions).map(([courseName, equivalencyStatus]) => ({
        courseName, equivalencyStatus
      }));

      const res = await fetch(`/api/migrations/${selected._id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseDecisions, remarks }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { setSuccess(false); setSelected(null); setDecisions({}); setRemarks(''); }, 3000);
        const r = await fetch('/api/migrations');
        const d = await r.json();
        if (d.status === 'success') setMigrations(d.data.migrations);
      } else {
        alert(data.message || 'Decision failed');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = selected ? selected.transferredCourses.reduce((acc, c) => ({
    ...acc,
    total: acc.total + c.credits,
    accepted: acc.accepted + (decisions[c.courseName] === 'accepted' ? c.credits : 0),
    rejected: acc.rejected + (decisions[c.courseName] === 'rejected' ? c.credits : 0),
  }), { total: 0, accepted: 0, rejected: 0 }) : { total: 0, accepted: 0, rejected: 0 };

  const pct = stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0;

  return (
    <div>

      {success && (
        <div style={{ padding: 12, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: '#166534' }}>
          <CheckCircle size={16} /> Migration decision submitted successfully. Degree progress recalculated.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}><CircularProgress size={16} /> Loading migrations...</div>
      ) : migrations.length === 0 ? (
        <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 40, textAlign: 'center', color: '#94A3B8' }}>
          No migration records found
        </div>
      ) : (
        <div className={`grid gap-6 ${selected ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Migration List */}
          <div>
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Student</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Source</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Courses</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {migrations.map(m => (
                    <tr key={m._id} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{m.studentId?.name || 'N/A'}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{m.studentId?.rollNumber || ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12 }}>{m.sourceInstitution}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{m.transferredCourses?.length || 0}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {m.decidedAt ? (
                          <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>Decided</span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>Pending</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {!m.decidedAt && (
                          <button onClick={() => { setSelected(m); setDecisions({}); setRemarks(''); }}
                            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#0F172A', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Decision Panel */}
          {selected && (
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ArrowRightLeft size={18} color="#2E75B6" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Equivalency Decision</h3>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, color: '#0F172A' }}>{selected.studentId?.name || 'N/A'} — <span style={{ color: '#64748B', fontWeight: 400 }}>{selected.sourceInstitution}</span></div>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>
                  <span>Credit Progress: {stats.accepted} / {stats.total} CH accepted ({pct}%)</span>
                </div>
                <div style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', backgroundColor: '#1B3A6B', borderRadius: 4, width: `${pct}%`, transition: 'width 0.3s' }} />
                </div>
              </div>

              {/* Course List */}
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.transferredCourses.map((course) => (
                  <div key={course.courseName} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                    borderRadius: 8, border: '1px solid #E2E8F0',
                    backgroundColor: decisions[course.courseName] === 'accepted' ? '#F0FDF4' : decisions[course.courseName] === 'rejected' ? '#FFF1F2' : '#FAFAFA'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{course.courseName}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{course.credits} CH</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setDecisions(d => ({ ...d, [course.courseName]: 'accepted' }))}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: `1px solid ${decisions[course.courseName] === 'accepted' ? '#16A34A' : '#E2E8F0'}`,
                          backgroundColor: decisions[course.courseName] === 'accepted' ? '#16A34A' : '#fff',
                          color: decisions[course.courseName] === 'accepted' ? '#fff' : '#64748B',
                          fontWeight: 600, fontSize: 12, cursor: 'pointer'
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setDecisions(d => ({ ...d, [course.courseName]: 'rejected' }))}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: `1px solid ${decisions[course.courseName] === 'rejected' ? '#EF4444' : '#E2E8F0'}`,
                          backgroundColor: decisions[course.courseName] === 'rejected' ? '#EF4444' : '#fff',
                          color: decisions[course.courseName] === 'rejected' ? '#fff' : '#64748B',
                          fontWeight: 600, fontSize: 12, cursor: 'pointer'
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Remarks */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Remarks (required if rejecting)</label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Add remarks..."
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical' }}
                />
              </div>

              <button
                onClick={handleDecide}
                disabled={submitting || Object.keys(decisions).length === 0}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                  backgroundColor: '#0F172A', color: '#fff', fontWeight: 600, fontSize: 13,
                  cursor: submitting || Object.keys(decisions).length === 0 ? 'not-allowed' : 'pointer',
                  opacity: submitting || Object.keys(decisions).length === 0 ? 0.5 : 1
                }}
              >
                {submitting ? 'Submitting...' : `Submit Decision (${Object.keys(decisions).length} courses)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
