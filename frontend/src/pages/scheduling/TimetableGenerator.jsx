import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  RefreshCw, Info, AlertTriangle, CheckCircle, Search, Edit2,
  LayoutGrid, FileText, Download, CheckCircle2, ChevronDown,
  MapPin, Clock, Users, BookOpen, Plus, UserPlus, Home, AlertCircle, FileBarChart, Calendar
} from "lucide-react";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMESLOTS = [
  '08:00 AM - 09:00 AM',
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM'
];

function detectTimetableConflicts(entries, batchSizes = {}) {
  const conflicts = [];
  const roomCapacities = {
    'Room 101': 50, 'Room 102': 45, 'Room 201': 60, 'Room 202': 60, 'Room 204': 60,
    'Lab A': 30, 'Lab B': 30, 'Lab 3 (Block B)': 50, 'Exam Hall': 120, 'Main Auditorium': 150
  };

  for (const entry of entries) {
    const studentCount = batchSizes[entry.batch] || 0;
    const capacity = roomCapacities[entry.room] || 40;
    if (studentCount > capacity) {
      conflicts.push({ type: 'CAPACITY_VIOLATION', description: `Capacity overflow in ${entry.room} for ${entry.courseCode}` });
    }
  }

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const e1 = entries[i]; const e2 = entries[j];
      if (e1.day === e2.day && e1.timeSlot === e2.timeSlot) {
        if (e1.room === e2.room) conflicts.push({ type: 'ROOM_OVERLAP', description: `Room clash in ${e1.room}: ${e1.courseCode} & ${e2.courseCode}` });
        if (e1.instructor && e1.instructor === e2.instructor) conflicts.push({ type: 'INSTRUCTOR_OVERLAP', description: `Faculty double booking: ${e1.instructor}` });
        if (e1.batch === e2.batch && e1.semester === e2.semester) conflicts.push({ type: 'COHORT_OVERLAP', description: `Cohort clash: Batch ${e1.batch} (Sem ${e1.semester}) scheduled for ${e1.courseCode} & ${e2.courseCode}` });
      }
    }
  }
  return conflicts;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#6366F1'];

export default function TimetableGenerator({ setActiveNav }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [batchSizes, setBatchSizes] = useState({});
  const [batches, setBatches] = useState([]);

  // Filters

  const [selectedDept, setSelectedDept] = useState("Computer Science");
  const [selectedProgram, setSelectedProgram] = useState("BS Computer Science");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  const [timingPage, setTimingPage] = useState(1);
  const timingLimit = 5;
  const [clashPage, setClashPage] = useState(1);
  const clashLimit = 5;

  useEffect(() => {
    fetchMetadataAndTimetable();
  }, []);

  const fetchMetadataAndTimetable = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { "Authorization": `Bearer ${token}` };

      const sizeRes = await fetch("/api/dashboard/students-by-batch", { headers });
      const sizeMap = {};
      if (sizeRes.ok) {
        const sizeData = await sizeRes.json();
        (sizeData.data || []).forEach(item => sizeMap[item.batchCode] = item.total);
      }
      setBatchSizes(sizeMap);

      const batchesRes = await fetch("/api/batches", { headers });
      if (batchesRes.ok) {
        const batchesData = await batchesRes.json();
        setBatches(batchesData.data || []);
        if (batchesData.data?.length > 0) {
          setSelectedBatchId(batchesData.data[0]._id);
        }
      }

      const timeRes = await fetch("/api/scheduling/timetable", { headers });
      if (timeRes.ok) {
        const timeData = await timeRes.json();
        const data = timeData.data?.entries || [];
        setEntries(data);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedBatchId) return;
    setGenerating(true);
    try {
      const payload = { batchId: selectedBatchId };
      if (selectedSemester) payload.semester = selectedSemester;

      const token = localStorage.getItem("token");
      const saveRes = await fetch("/api/scheduling/auto-generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      if (saveRes.ok) {
        const timeRes = await fetch("/api/scheduling/timetable");
        if (timeRes.ok) {
          const timeData = await timeRes.json();
          const allEntries = timeData.data?.entries || [];
          setEntries(allEntries);
        }
      }
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportTimetable = () => {
    if (!entries || entries.length === 0) {
      alert('No timetable records available to export.');
      return;
    }

    const headers = ['Day', 'Time Slot', 'Course Code', 'Course Name', 'Room', 'Instructor', 'Batch', 'Semester'];
    const rows = entries.map(e => [
      e.day,
      e.timeSlot,
      e.courseCode,
      e.courseName,
      e.room,
      e.instructor || 'TBD',
      e.batch,
      e.semester || '6'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const cell = val === null || val === undefined ? '' : String(val);
        return cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Weekly_Timetable_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Dynamic Metrics (Scoped to Selected Batch and Semester) ---
  const selectedBatchObj = batches.find(b => b._id === selectedBatchId);
  const semFilterStr = selectedSemester ? String(selectedSemester) : null;
  const filtered = entries.filter(e => {
    const matchesBatch = !selectedBatchObj || !e.batch || e.batch.toUpperCase() === selectedBatchObj.code.toUpperCase() || String(e.batchId?._id || e.batchId) === String(selectedBatchObj._id);
    const matchesSem = !semFilterStr || !e.semester || String(e.semester) === semFilterStr;
    return matchesBatch || matchesSem;
  });
  const filteredEntries = filtered.length > 0 ? filtered : entries;



  const conflicts = detectTimetableConflicts(filteredEntries, batchSizes);
  const totalClasses = filteredEntries.length;
  const totalCourses = new Set(filteredEntries.map(e => e.courseCode)).size;
  const totalInstructors = new Set(filteredEntries.filter(e => e.instructor).map(e => e.instructor)).size;
  const totalRooms = new Set(filteredEntries.filter(e => e.room).map(e => e.room)).size;
  const totalLabSessions = filteredEntries.filter(e => e.room?.toLowerCase().includes('lab') || e.courseName?.toLowerCase().includes('lab')).length;

  // --- Room Utilization Donut Chart Data ---
  const roomCounts = {};
  filteredEntries.forEach(e => {
    if (e.room) roomCounts[e.room] = (roomCounts[e.room] || 0) + 1;
  });
  const roomData = Object.entries(roomCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // --- Class Timing Details Aggregation ---
  const timingDetails = [];
  const courseGroups = {};
  filteredEntries.forEach(e => {
    if (!courseGroups[e.courseCode]) {
      courseGroups[e.courseCode] = {
        code: e.courseCode,
        title: e.courseName,
        type: (e.room?.toLowerCase().includes('lab') || e.courseName?.toLowerCase().includes('lab')) ? 'Lab' : 'Theory',
        credits: e.creditHours || 3,
        instructor: e.instructor,
        room: e.room,
        sessions: 0
      };
    }
    courseGroups[e.courseCode].sessions += 1;
  });
  Object.values(courseGroups).forEach(g => timingDetails.push(g));

  const getSlotColor = (courseName, room) => {
    const isLab = room?.toLowerCase().includes('lab') || courseName?.toLowerCase().includes('lab');
    if (isLab) return 'bg-cyan-50 border-cyan-100 border-l-cyan-500 text-cyan-900';
    if (courseName?.includes('Database') || courseName?.includes('Software')) return 'bg-emerald-50 border-emerald-100 border-l-emerald-500 text-emerald-900';
    if (courseName?.includes('AI') || courseName?.includes('Artificial')) return 'bg-pink-50 border-pink-100 border-l-pink-500 text-pink-900';
    if (courseName?.includes('Operating')) return 'bg-amber-50 border-amber-100 border-l-amber-500 text-amber-900';
    return 'bg-indigo-50 border-indigo-100 border-l-indigo-500 text-indigo-900';
  };




  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 p-4 sm:p-6 pb-20 font-sans max-w-full overflow-x-hidden">

      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Department</label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-lg outline-none cursor-pointer">
                <option>Computer Science</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Program</label>
            <div className="relative">
              <select className="w-full appearance-none bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-lg outline-none cursor-pointer">
                <option>BS Computer Science</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Batch (Year-Term)</label>
            <div className="relative">
              <select
                value={selectedBatchId}
                onChange={e => setSelectedBatchId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-lg outline-none cursor-pointer pr-8"
              >
                {batches.map(b => <option key={b._id} value={b._id}>{b.code} ({b.startYear || 2024})</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Semester</label>
            <div className="relative">
              <select
                value={selectedSemester}
                onChange={e => setSelectedSemester(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-lg outline-none cursor-pointer pr-8"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff',
              border: 'none', borderRadius: '10px',
              fontSize: '13px', fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { if(!generating) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.3)'; } }}
            onMouseLeave={e => { if(!generating) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.2)'; } }}
          >
            <RefreshCw size={15} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Processing...' : 'Generate Algorithm'}
          </button>
          <button
            onClick={handleExportTimetable}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#EFF6FF', color: '#2563EB',
              border: '1px solid #BFDBFE', borderRadius: '10px',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#2563EB'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; }}
          >
            <Download size={15} /> Export Timetable
          </button>
        </div>
      </div>

      <div className="space-y-6">

          {/* Main Grid Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-extrabold text-slate-800">
                  Weekly Timetable — {selectedBatchObj?.code || 'All Batches'} {selectedSemester ? `- Semester ${selectedSemester}` : '- All Semesters'}
                </h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-200">Published</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveNav && setActiveNav('schedule_override')}
                  style={{
                    padding: '9px 18px',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#fff', border: 'none', borderRadius: '10px',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37,99,235,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.2)'; }}
                >
                  Edit Timetable
                </button>

              </div>
            </div>

            <div className="overflow-x-auto">


              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3 w-36 text-center border-r border-slate-100">Time / Day</th>
                    {DAYS.map(day => <th key={day} className="px-4 py-3 text-center border-r border-slate-100 w-44">{day}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {TIMESLOTS.map((slot, index) => (
                    <React.Fragment key={slot}>
                      <tr className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-4 py-5 text-center font-bold text-slate-600 border-r border-slate-100 align-middle bg-slate-50/30">
                          {slot}
                        </td>
                        {DAYS.map(day => {
                          const cellEntries = filteredEntries.filter(e => e.day === day && e.timeSlot === slot);
                          return (
                            <td key={day} className="p-2 border-r border-slate-100 align-top h-auto min-h-[6.5rem]">
                              {cellEntries.length === 0 ? (
                                <div className="h-full min-h-[5.5rem] flex items-center justify-center p-1.5">
                                  <span className="text-[9px] font-extrabold text-slate-300 tracking-wider uppercase bg-slate-50 border border-slate-200/50 px-2 py-1 rounded border-dashed select-none">
                                    FREE SLOT
                                  </span>
                                </div>
                              ) : (
                                cellEntries.map((entry, i) => (
                                  <div key={i} className={`p-2.5 rounded-lg border border-l-4 ${getSlotColor(entry.courseName, entry.room)} mb-2 flex flex-col text-left shadow-sm transition-all hover:shadow-md h-full min-h-[5.5rem]`}>
                                    <span className="font-bold text-[11px] leading-tight mb-1">{entry.courseCode} - {entry.courseName}</span>
                                    <div className="mt-auto flex flex-col gap-0.5 pt-1 border-t border-slate-200/50">
                                      <span className="font-bold text-[10px] text-amber-800">{entry.room}</span>
                                      <span className="font-semibold text-[10px] text-slate-600">{entry.instructor}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Bottom Table: Class Timing Details */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 overflow-hidden min-w-0">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Class Timing Details</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Course Title</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Credit Hours</th>
                      <th className="px-4 py-3">Instructor</th>
                      <th className="px-4 py-3">Room</th>
                      <th className="px-4 py-3 text-center">Sessions / Week</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {timingDetails.length > 0 ? (() => {
                      const currentTimingDetails = timingDetails.slice(
                        (timingPage - 1) * timingLimit,
                        timingPage * timingLimit
                      );
                      return currentTimingDetails.map((td, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-800 font-bold">{td.code}</td>
                          <td className="px-4 py-3 text-slate-600">{td.title}</td>
                          <td className="px-4 py-3 text-slate-500">{td.type}</td>
                          <td className="px-4 py-3 text-slate-500">{td.credits}</td>
                          <td className="px-4 py-3 text-slate-800">{td.instructor}</td>
                          <td className="px-4 py-3 text-brandNavy font-bold">{td.room}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-600">{td.sessions}</td>
                        </tr>
                      ));
                    })() : (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No classes scheduled</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {timingDetails.length > 0 && (
                <div className="flex justify-between items-center mt-4 text-xs">
                  <span className="text-slate-500 font-medium">
                    Showing {(timingPage - 1) * timingLimit + 1}–{Math.min(timingPage * timingLimit, timingDetails.length)} of {timingDetails.length} classes
                  </span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: Math.ceil(timingDetails.length / timingLimit) }, (_, idx) => idx + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setTimingPage(p)}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all ${timingPage === p ? 'bg-brandAccent text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Panel: Clash Check */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col min-w-0">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Timetable Clash Check</h3>

              {conflicts.length === 0 ? (
                <div className="flex-1 bg-emerald-50/50 border border-emerald-100 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-extrabold text-emerald-700 mb-1">No Clashes Found!</h4>
                  <p className="text-xs text-emerald-600/80 font-medium">Great! There are no faculty, room or student clashes in this timetable.</p>
                </div>
              ) : (
                <div className="flex-1 bg-rose-50/50 border border-rose-100 rounded-xl p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-3 text-rose-700">
                    <AlertTriangle className="w-5 h-5" />
                    <h4 className="text-sm font-extrabold">Clashes Detected ({conflicts.length})</h4>
                  </div>
                  <ul className="space-y-2 pr-1 mb-3">
                    {(() => {
                      const currentConflicts = conflicts.slice((clashPage - 1) * clashLimit, clashPage * clashLimit);
                      return currentConflicts.map((c, i) => (
                        <li key={i} className="text-[11px] p-2 bg-white rounded border border-rose-100 text-rose-800 shadow-sm">
                          <strong className="block text-[10px] uppercase font-bold text-rose-500 mb-0.5">{c.type}</strong>
                          {c.description}
                        </li>
                      ));
                    })()}
                  </ul>
                  {conflicts.length > clashLimit && (
                    <div className="flex justify-between items-center mt-auto text-xs border-t border-rose-100 pt-3">
                      <span className="text-rose-600/80 font-medium">
                        Showing {(clashPage - 1) * clashLimit + 1}–{Math.min(clashPage * clashLimit, conflicts.length)} of {conflicts.length}
                      </span>
                      <div className="flex gap-1.5">
                        {Array.from({ length: Math.ceil(conflicts.length / clashLimit) }, (_, idx) => idx + 1).map(p => (
                          <button
                            key={p}
                            onClick={() => setClashPage(p)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${clashPage === p ? 'bg-rose-500 text-white' : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'}`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Summary Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Timetable Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Timetable Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5 text-slate-600 text-xs font-bold">
                  <LayoutGrid className="w-4 h-4 text-brandAccent" /> Total Classes
                </div>
                <span className="text-sm font-extrabold text-slate-800">{totalClasses}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5 text-slate-600 text-xs font-bold">
                  <BookOpen className="w-4 h-4 text-emerald-500" /> Total Courses
                </div>
                <span className="text-sm font-extrabold text-slate-800">{totalCourses}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5 text-slate-600 text-xs font-bold">
                  <Users className="w-4 h-4 text-purple-500" /> Total Instructors
                </div>
                <span className="text-sm font-extrabold text-slate-800">{totalInstructors}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5 text-slate-600 text-xs font-bold">
                  <Home className="w-4 h-4 text-amber-500" /> Total Rooms Used
                </div>
                <span className="text-sm font-extrabold text-slate-800">{totalRooms}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5 text-slate-600 text-xs font-bold">
                  <FileText className="w-4 h-4 text-pink-500" /> Total Lab Sessions
                </div>
                <span className="text-sm font-extrabold text-slate-800">{totalLabSessions}</span>
              </div>
            </div>
          </div>

          {/* Room Utilization Donut Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Room Utilization</h3>
            {roomData.length > 0 ? (
              <>
                <div className="h-40 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roomData}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {roomData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => [`${val} slots`, 'Usage']} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-extrabold text-slate-800">{entries.length}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Slots</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-1">
                  {roomData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="truncate max-w-[70px]" title={entry.name}>{entry.name}</span>
                      <span className="text-slate-400 ml-auto">{Math.round((entry.value / (entries.length || 1)) * 100)}%</span>

                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-bold">
                  <span className="text-brandNavy">Overall Room Utilization:</span>
                  <span className="text-emerald-600">76%</span>
                </div>
              </>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-slate-400">No room data available</div>
            )}
          </div>



          {/* Timetable Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Timetable Info</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Batch:</span>
                <span className="font-bold text-slate-800">{selectedBatchObj?.code || 'All Batches'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Program:</span>
                <span className="font-bold text-slate-800">{selectedProgram}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Semester:</span>
                <span className="font-bold text-slate-800">{selectedSemester ? `Semester ${selectedSemester}` : 'All Semesters'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
