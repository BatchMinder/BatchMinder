import React, { useState, useEffect } from 'react';
import {
  Calendar, AlertTriangle, CheckCircle, RefreshCw, Download,
  Filter, BarChart2, Clock, BookOpen, Users, Info, Layers
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMESLOTS = [
  '08:30 AM - 10:00 AM',
  '10:00 AM - 11:30 AM',
  '11:30 AM - 01:00 PM',
  '01:30 PM - 03:00 PM',
  '03:00 PM - 04:30 PM'
];

function detectClashes(entries) {
  const clashes = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i], b = entries[j];
      if (a.day === b.day && a.timeSlot === b.timeSlot) {
        if (a.room && a.room === b.room)
          clashes.push({ type: 'ROOM', msg: `Room clash in ${a.room}: ${a.courseCode} & ${b.courseCode}`, ids: [a._id, b._id] });
        if (a.instructor && a.instructor === b.instructor)
          clashes.push({ type: 'INSTRUCTOR', msg: `Instructor clash: ${a.instructor} → ${a.courseCode} & ${b.courseCode}`, ids: [a._id, b._id] });
        if (a.batch && a.batch === b.batch)
          clashes.push({ type: 'BATCH', msg: `Batch clash: ${a.batch} has ${a.courseCode} & ${b.courseCode} simultaneously`, ids: [a._id, b._id] });
      }
    }
  }
  return clashes;
}

export default function AdvisorTimetable() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clashes, setClashes] = useState([]);
  const [batchFilter, setBatchFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [batches, setBatches] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [timeRes, batchRes] = await Promise.all([
        fetch('/api/scheduling/timetable'),
        fetch('/api/batches')
      ]);
      if (timeRes.ok) {
        const d = await timeRes.json();
        const data = d.data?.entries || [];
        setEntries(data);
        setClashes(detectClashes(data));
      }
      if (batchRes.ok) {
        const d = await batchRes.json();
        setBatches(d.data || []);
      }
    } catch (e) {
      console.error('Timetable fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    try {
      const res = await fetch('/api/scheduling/auto-generate', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      if (res.ok) alert('Intelligent Scheduling Engine: ' + data.message);
      else alert('Failed to auto-generate: ' + data.message);
    } catch (e) {
      console.error(e);
    }
  };

  const [capacityAlerts, setCapacityAlerts] = useState([]);
  const checkCapacities = async () => {
    const alerts = [];
    // Just a mocked simulation of checking the current filtered grid
    for (const [room, count] of Object.entries(roomUsage)) {
      const simulatedStudentCount = count * 20; // simulate students
      const res = await fetch('/api/scheduling/validate-capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, studentCount: simulatedStudentCount })
      });
      const data = await res.json();
      if (res.ok && !data.data.isValid) {
        alerts.push(data.data.message);
      }
    }
    setCapacityAlerts(alerts);
    if (alerts.length === 0) alert('All scheduled rooms passed capacity validation!');
  };

  // Filtered entries
  const filtered = entries.filter(e => {
    const batchMatch = batchFilter === 'all' || e.batch === batchFilter;
    const semMatch = semesterFilter === 'all' || String(e.semester) === semesterFilter;
    return batchMatch && semMatch;
  });

  // Room utilization
  const roomUsage = {};
  filtered.forEach(e => {
    if (e.room) roomUsage[e.room] = (roomUsage[e.room] || 0) + 1;
  });
  const totalSlots = DAYS.length * TIMESLOTS.length;
  const clashIds = new Set(clashes.flatMap(c => c.ids));

  // Export timetable as CSV
  const exportCSV = () => {
    const header = ['Day', 'Time Slot', 'Course Code', 'Course Name', 'Batch', 'Semester', 'Room', 'Instructor'];
    const rows = filtered.map(e => [e.day, e.timeSlot, e.courseCode, e.courseName, e.batch, e.semester || 'N/A', e.room, e.instructor]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'timetable.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const semesters = [...new Set(entries.map(e => e.semester).filter(Boolean))].sort((a, b) => a - b);
  const batchCodes = [...new Set(entries.map(e => e.batch).filter(Boolean))].sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            6.2.11 — Timetable Management Screen
          </p>
          <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            Weekly Timetable
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748B' }}>
            View class schedule, detect clashes, and monitor room utilization
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleAutoGenerate} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
            borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC',
            fontSize: '12px', fontWeight: 700, color: '#475569', cursor: 'pointer'
          }}>
            <Calendar size={14} /> Auto-Generate
          </button>
          <button onClick={checkCapacities} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
            borderRadius: '10px', border: 'none', backgroundColor: '#F59E0B',
            fontSize: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer'
          }}>
            <Users size={14} /> Validate Capacity
          </button>
          <button onClick={fetchData} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
            borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#fff',
            fontSize: '12px', fontWeight: 700, color: '#475569', cursor: 'pointer'
          }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={exportCSV} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
            borderRadius: '10px', border: 'none', backgroundColor: '#2563EB',
            fontSize: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer'
          }}>
            <Download size={14} /> Export Timetable
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {[
          { label: 'Total Classes', value: filtered.length, color: '#2563EB', bg: '#EFF6FF', icon: BookOpen },
          { label: 'Unique Rooms', value: Object.keys(roomUsage).length, color: '#16A34A', bg: '#F0FDF4', icon: Layers },
          { label: 'Batches Scheduled', value: batchCodes.length, color: '#7C3AED', bg: '#F5F3FF', icon: Users },
          { label: 'Clash Alerts', value: clashes.length, color: clashes.length > 0 ? '#EF4444' : '#16A34A', bg: clashes.length > 0 ? '#FEF2F2' : '#F0FDF4', icon: clashes.length > 0 ? AlertTriangle : CheckCircle }
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
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
              <h3 style={{ margin: '2px 0 0', fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.5px' }}>{loading ? '...' : value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {capacityAlerts.length > 0 && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertTriangle size={18} color="#DC2626" />
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>Capacity Exceeded</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {capacityAlerts.map((msg, i) => (
                  <div key={i} style={{ padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', fontSize: '11px', color: '#DC2626', fontWeight: 600, border: '1px solid #FECACA' }}>
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '12px', fontWeight: 700 }}>
              <Filter size={14} /> Filters:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Batch</label>
              <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} style={{
                padding: '5px 10px', borderRadius: '8px', border: '1px solid #E2E8F0',
                fontSize: '12px', fontWeight: 700, color: '#1E293B', outline: 'none',
                backgroundColor: '#F8FAFC', cursor: 'pointer', fontFamily: 'inherit'
              }}>
                <option value="all">All Batches</option>
                {batchCodes.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Semester</label>
              <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)} style={{
                padding: '5px 10px', borderRadius: '8px', border: '1px solid #E2E8F0',
                fontSize: '12px', fontWeight: 700, color: '#1E293B', outline: 'none',
                backgroundColor: '#F8FAFC', cursor: 'pointer', fontFamily: 'inherit'
              }}>
                <option value="all">All Semesters</option>
                {semesters.map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
              </select>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>
              Showing {filtered.length} class slots
            </span>
          </div>

          {/* Weekly Grid */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: '13px', fontWeight: 600 }}>
                <RefreshCw size={20} style={{ display: 'inline', animation: 'spin 1s linear infinite', marginRight: '8px' }} />
                Loading timetable...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                <Calendar size={36} color="#CBD5E1" style={{ display: 'block', margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#475569' }}>No Timetable Found</p>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94A3B8' }}>
                  The timetable has not been generated yet. Ask your academic administrator to generate it.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.8px', width: '140px', borderRight: '1px solid #F1F5F9' }}>
                        Time Slot
                      </th>
                      {DAYS.map(day => (
                        <th key={day} style={{ padding: '12px', textAlign: 'center', fontWeight: 800, color: '#475569', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.8px', minWidth: '150px' }}>
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIMESLOTS.map((slot, si) => (
                      <tr key={slot} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 16px', backgroundColor: '#F8FAFC', borderRight: '1px solid #F1F5F9', fontWeight: 700, color: '#475569', fontSize: '10px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          <Clock size={11} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                          {slot}
                        </td>
                        {DAYS.map(day => {
                          const cells = filtered.filter(e => e.day === day && e.timeSlot === slot);
                          return (
                            <td key={day} style={{ padding: '6px', verticalAlign: 'top', minHeight: '80px', borderRight: '1px solid #F1F5F9' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {cells.map(entry => {
                                  const isClash = clashIds.has(entry._id);
                                  return (
                                    <div key={entry._id} style={{
                                      padding: '7px 9px', borderRadius: '8px',
                                      backgroundColor: isClash ? '#FEF2F2' : '#EFF6FF',
                                      border: `1px solid ${isClash ? '#FECACA' : '#BFDBFE'}`,
                                      fontSize: '10px'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: isClash ? '#991B1B' : '#1E3A8A' }}>
                                        <span>{entry.courseCode}</span>
                                        <span style={{ fontSize: '9px', backgroundColor: '#fff', border: `1px solid ${isClash ? '#FECACA' : '#BFDBFE'}`, borderRadius: '4px', padding: '1px 5px' }}>{entry.batch}</span>
                                      </div>
                                      <div style={{ color: '#475569', fontWeight: 600, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.courseName}</div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', color: '#94A3B8', fontSize: '9px' }}>
                                        <span>🏫 {entry.room}</span>
                                        <span>👤 {(entry.instructor || '').split(' ').pop()}</span>
                                      </div>
                                      {isClash && <div style={{ marginTop: '3px', fontSize: '9px', fontWeight: 700, color: '#EF4444' }}>⚠ CLASH</div>}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Clash Detection Panel */}
          <div style={{
            backgroundColor: '#fff', border: `1px solid ${clashes.length > 0 ? '#FECACA' : '#E2E8F0'}`,
            borderRadius: '14px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              <AlertTriangle size={15} color={clashes.length > 0 ? '#EF4444' : '#16A34A'} />
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Clash Detection</h3>
              {clashes.length > 0 && (
                <span style={{ marginLeft: 'auto', backgroundColor: '#FEE2E2', color: '#EF4444', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px' }}>
                  {clashes.length} CLASH{clashes.length > 1 ? 'ES' : ''}
                </span>
              )}
            </div>
            {clashes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle size={28} color="#16A34A" style={{ display: 'block', margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#16A34A' }}>No Clashes Detected</p>
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#94A3B8' }}>Timetable is conflict-free</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {clashes.map((c, i) => (
                  <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <span style={{ display: 'inline-block', fontSize: '9px', fontWeight: 800, color: '#991B1B', backgroundColor: '#FEE2E2', padding: '1px 6px', borderRadius: '4px', marginBottom: '4px', textTransform: 'uppercase' }}>
                      {c.type}
                    </span>
                    <p style={{ margin: 0, fontSize: '10px', color: '#7F1D1D', fontWeight: 600, lineHeight: 1.4 }}>{c.msg}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Room Utilization Chart */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              <BarChart2 size={15} color="#2563EB" />
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Room Utilization</h3>
            </div>
            {Object.keys(roomUsage).length === 0 ? (
              <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', textAlign: 'center', padding: '12px 0' }}>No data</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(roomUsage).sort((a, b) => b[1] - a[1]).map(([room, count]) => {
                  const pct = Math.round((count / totalSlots) * 100);
                  return (
                    <div key={room}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>{room}</span>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B' }}>{count} classes</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 70 ? '#EF4444' : pct > 40 ? '#F59E0B' : '#2563EB', borderRadius: '4px', transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timetable Summary Panel */}
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Info size={14} color="#64748B" />
              <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Summary</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Days Covered', value: `${DAYS.length} days/week` },
                { label: 'Time Slots', value: `${TIMESLOTS.length} slots/day` },
                { label: 'Total Capacity', value: `${totalSlots} max slots` },
                { label: 'Utilization', value: filtered.length > 0 ? `${Math.round((filtered.length / (batchCodes.length * totalSlots)) * 100)}%` : '0%' }
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
