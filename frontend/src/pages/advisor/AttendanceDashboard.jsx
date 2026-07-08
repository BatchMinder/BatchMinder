import React, { useState, useEffect } from 'react';
import { CalendarCheck, Search, Save, AlertTriangle, Filter, CheckCircle2 } from 'lucide-react';
import { CircularProgress } from '@mui/material';

export default function AttendanceDashboard({ user }) {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [courses, setCourses] = useState([]);
  const [courseCode, setCourseCode] = useState('');
  
  const [roster, setRoster] = useState([]);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  
  const [view, setView] = useState('work'); // 'work' | 'report'

  // Fetch batches for filter
  useEffect(() => {
    fetch('/api/batches')
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') {
          // If advisor, filter to assigned batches
          let available = d.data;
          if (user?.role === 'advisor' && user?.assignedBatchIds) {
            available = available.filter(b => user.assignedBatchIds.includes(b._id));
          }
          setBatches(available);
          if (available.length > 0) setSelectedBatchId(available[0]._id);
        }
      });
  }, [user]);

  // Fetch courses when a batch is selected
  useEffect(() => {
    if (!selectedBatchId) {
      setCourses([]);
      return;
    }
    fetch(`/api/attendance/courses?batchId=${selectedBatchId}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') {
          setCourses(d.data.courses);
          if (d.data.courses.length > 0) {
            setCourseCode(d.data.courses[0].code);
          } else {
            setCourseCode('');
            setRoster([]);
          }
        }
      });
  }, [selectedBatchId]);

  // Fetch low attendance report automatically
  useEffect(() => {
    fetch('/api/attendance/report')
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') setReport(d.data.report);
      });
  }, []);

  const fetchRoster = async () => {
    if (!selectedBatchId || !courseCode.trim()) return;
    setLoading(true);
    setSuccess('');
    try {
      const res = await fetch(`/api/attendance?batchId=${selectedBatchId}&courseCode=${encodeURIComponent(courseCode.trim())}`);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setRoster(data.data.roster);
      } else {
        alert(data.message || 'Failed to fetch roster');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId, value) => {
    let val = parseInt(value, 10);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > 100) val = 100;
    setRoster(prev => prev.map(s => s._id === studentId ? { ...s, attendance: val } : s));
  };

  const handleSaveAll = async () => {
    if (roster.length === 0) return;
    setSaving(true);
    setSuccess('');
    try {
      const updates = roster.map(s => ({ studentId: s._id, attendance: s.attendance }));
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseCode: courseCode.trim(), updates })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSuccess('Attendance updated successfully for all students.');
        // Refresh report
        fetch('/api/attendance/report')
          .then(r => r.json())
          .then(d => { if (d.status === 'success') setReport(d.data.report); });
      } else {
        alert(data.message || 'Failed to save');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarCheck color="#2563EB" /> Attendance Management
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>Track course attendance and monitor at-risk students.</p>
        </div>
        
        <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 8 }}>
          <button 
            onClick={() => setView('work')}
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', backgroundColor: view === 'work' ? '#FFF' : 'transparent', color: view === 'work' ? '#0F172A' : '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: view === 'work' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>
            Update Attendance
          </button>
          <button 
            onClick={() => setView('report')}
            style={{ padding: '6px 16px', borderRadius: 6, border: 'none', backgroundColor: view === 'report' ? '#FFF' : 'transparent', color: view === 'report' ? '#0F172A' : '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: view === 'report' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            Low Attendance Report
            {report.length > 0 && <span style={{ backgroundColor: '#EF4444', color: '#FFF', fontSize: 10, padding: '2px 6px', borderRadius: 999 }}>{report.length}</span>}
          </button>
        </div>
      </div>

      {view === 'work' && (
        <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Select Batch</label>
              <select 
                value={selectedBatchId} 
                onChange={e => setSelectedBatchId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', outline: 'none' }}
              >
                {batches.map(b => <option key={b._id} value={b._id}>{b.code}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Select Course</label>
              <select 
                value={courseCode}
                onChange={e => setCourseCode(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', outline: 'none' }}
              >
                <option value="">{courses.length === 0 ? 'No courses found' : 'Select Course...'}</option>
                {courses.map(c => <option key={c.code} value={c.code}>{c.code} - {c.title}</option>)}
              </select>
            </div>
            <button 
              onClick={fetchRoster}
              disabled={loading || !courseCode}
              style={{ height: 40, padding: '0 20px', borderRadius: 8, backgroundColor: '#0F172A', color: '#FFF', border: 'none', fontWeight: 600, cursor: loading || !courseCode ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: loading || !courseCode ? 0.7 : 1 }}>
              {loading ? <CircularProgress size={16} color="inherit" /> : <Search size={16} />}
              Fetch Roster
            </button>
          </div>

          {success && (
            <div style={{ padding: 12, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#166534', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle2 size={16} /> {success}
            </div>
          )}

          {roster.length > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Enrolled Students ({roster.length})</div>
                <button 
                  onClick={handleSaveAll}
                  disabled={saving}
                  style={{ padding: '8px 16px', borderRadius: 8, backgroundColor: '#2563EB', color: '#FFF', border: 'none', fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
                  {saving ? <CircularProgress size={14} color="inherit" /> : <Save size={14} />}
                  Save All Changes
                </button>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Roll Number</th>
                      <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Student Name</th>
                      <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600, width: 150 }}>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(student => (
                      <tr key={student._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', color: '#64748B', fontFamily: 'monospace' }}>{student.rollNumber}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{student.name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <input 
                            type="number" 
                            min="0" max="100"
                            value={student.attendance}
                            onChange={(e) => handleAttendanceChange(student._id, e.target.value)}
                            style={{ 
                              width: 80, padding: '6px 10px', borderRadius: 6, 
                              border: `1px solid ${student.attendance < 75 ? '#FCA5A5' : '#E2E8F0'}`, 
                              outline: 'none', fontWeight: 600,
                              color: student.attendance < 75 ? '#DC2626' : '#0F172A',
                              backgroundColor: student.attendance < 75 ? '#FEF2F2' : '#FFF'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
              <Filter size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
              <div>Select a batch and enter a course code to view the class roster.</div>
            </div>
          )}
        </div>
      )}

      {view === 'report' && (
        <div style={{ backgroundColor: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <AlertTriangle color="#EF4444" size={20} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Low Attendance Report (&lt; 75%)</h2>
          </div>

          {report.length > 0 ? (
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Batch</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Student</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Course</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: '#FEF2F2' }}>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>{r.batch}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{r.rollNumber}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#0F172A' }}>
                        <div style={{ fontWeight: 600 }}>{r.courseCode}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{r.courseTitle}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#DC2626' }}>{r.attendance}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#16A34A', backgroundColor: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
              <CheckCircle2 size={32} style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 600 }}>All Good!</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>No students are currently below the 75% attendance threshold.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
