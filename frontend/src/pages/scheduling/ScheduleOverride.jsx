import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Edit2, Plus, Trash2, X, Info, AlertTriangle, CheckCircle, ClipboardList, Clock } from "lucide-react";
import { useModal } from "../../contexts/ModalContext";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMESLOTS = [
  '08:00 AM - 09:00 AM',
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM'
];
const EXAMSLOTS = [
  '09:00 AM - 12:00 PM',
  '02:00 PM - 05:00 PM'
];
const DATES = [
  '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17',
  '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'
];
const ROOMS = ['Room 101', 'Room 102', 'Room 201', 'Room 202', 'Exam Hall', 'Lab A', 'Lab B'];

function detectTimetableConflicts(entries, batchSizes = {}) {
  const conflicts = [];
  const roomCapacities = {
    'Room 101': 40,
    'Room 102': 50,
    'Room 201': 40,
    'Room 202': 40,
    'Room 204': 60,
    'Lab A': 30,
    'Lab B': 30,
    'Lab 3 (Block B)': 50,
    'Exam Hall': 120,
    'Main Auditorium': 150
  };

  // 1. Capacity Violation Check
  for (const entry of entries) {
    const batchCode = entry.batch;
    const studentCount = batchSizes[batchCode] || 0;
    const room = entry.room;
    const roomCapacity = roomCapacities[room] || 40; // Default capacity
    if (studentCount > roomCapacity) {
      conflicts.push({
        type: 'CAPACITY_VIOLATION',
        description: `Seating capacity overflow in ${room} for ${entry.courseCode} (${batchCode}): Enrolled (${studentCount}) > Capacity (${roomCapacity})`,
        cellIds: [entry._id || entry.id]
      });
    }
  }

  // 2. Overlap Checks (Room, Instructor, Cohort/Batch)
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const e1 = entries[i];
      const e2 = entries[j];

      // Must be on the same day and time slot to overlap
      if (e1.day === e2.day && e1.timeSlot === e2.timeSlot) {
        const id1 = e1._id || e1.id;
        const id2 = e2._id || e2.id;

        // Room Overlap
        if (e1.room === e2.room) {
          conflicts.push({
            type: 'ROOM_OVERLAP',
            description: `Room clash in ${e1.room}: ${e1.courseCode} (${e1.batch}) and ${e2.courseCode} (${e2.batch}) are both assigned here.`,
            cellIds: [id1, id2]
          });
        }

        // Instructor Overlap
        if (e1.instructor && e2.instructor && e1.instructor === e2.instructor) {
          conflicts.push({
            type: 'INSTRUCTOR_OVERLAP',
            description: `Faculty double booking: ${e1.instructor} is assigned to both ${e1.courseCode} (${e1.batch}) and ${e2.courseCode} (${e2.batch}).`,
            cellIds: [id1, id2]
          });
        }

        // Cohort/Batch Overlap
        if (e1.batch === e2.batch && e1.semester === e2.semester) {
          conflicts.push({
            type: 'COHORT_OVERLAP',
            description: `Cohort clash: Batch ${e1.batch} (Sem ${e1.semester}) is scheduled for both ${e1.courseCode} and ${e2.courseCode} simultaneously.`,
            cellIds: [id1, id2]
          });
        }
      }
    }
  }

  return conflicts;
}

function detectDatesheetConflicts(entries) {
  const conflicts = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const e1 = entries[i];
      const e2 = entries[j];

      // Must be on the same date and exam slot to overlap
      if (e1.date === e2.date && e1.examSlot === e2.examSlot) {
        const id1 = e1._id || e1.id;
        const id2 = e2._id || e2.id;

        // Room Overlap
        if (e1.room === e2.room) {
          conflicts.push({
            type: 'ROOM_OVERLAP',
            description: `Room clash in ${e1.room}: Exam for ${e1.courseCode} (${e1.batch}) and ${e2.courseCode} (${e2.batch}) are both assigned here.`,
            cellIds: [id1, id2]
          });
        }

        // Invigilator Overlap
        if (e1.invigilator && e2.invigilator && e1.invigilator === e2.invigilator) {
          conflicts.push({
            type: 'INVIGILATOR_OVERLAP',
            description: `Invigilator clash: ${e1.invigilator} is assigned to invigilate both ${e1.courseCode} (${e1.batch}) and ${e2.courseCode} (${e2.batch}).`,
            cellIds: [id1, id2]
          });
        }

        // Cohort/Batch Overlap
        if (e1.batch === e2.batch) {
          conflicts.push({
            type: 'COHORT_OVERLAP',
            description: `Cohort clash: Batch ${e1.batch} has exams for both ${e1.courseCode} and ${e2.courseCode} scheduled at the same time.`,
            cellIds: [id1, id2]
          });
        }
      }
    }
  }

  return conflicts;
}

function ScheduleOverride({ initialTab = "timetable" }) {
  const { user } = useAuth();
  const { showConfirm, showAlert, showSuccess } = useModal();
  const [activeTab, setActiveTab] = useState(initialTab); // "timetable" | "datesheet"

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [entries, setEntries] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [batchSizes, setBatchSizes] = useState({});

  // Modal control states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [formError, setFormError] = useState("");

  // Form input states
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [room, setRoom] = useState("");
  const [instructorOrInvigilator, setInstructorOrInvigilator] = useState("");
  const [batch, setBatch] = useState("");
  const [slotDayOrDate, setSlotDayOrDate] = useState("");
  const [slotTimeOrPeriod, setSlotTimeOrPeriod] = useState("");

  // Audit logs local state
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    fetchMetadataAndData(activeTab);
    loadAuditLogs(activeTab);
  }, [activeTab, refreshTrigger]);

  const fetchMetadataAndData = async (tab) => {
    setLoading(true);
    try {
      const sizeRes = await fetch("/api/dashboard/students-by-batch");
      let sizeMap = {};
      if (sizeRes.ok) {
        const sizeData = await sizeRes.json();
        if (sizeData.data && Array.isArray(sizeData.data)) {
          sizeData.data.forEach(item => {
            sizeMap[item.batchCode] = item.total;
          });
        }
      }
      setBatchSizes(sizeMap);

      const endpoint = tab === "timetable" ? "/api/scheduling/timetable" : "/api/scheduling/datesheet";
      const dataRes = await fetch(endpoint);
      if (dataRes.ok) {
        const result = await dataRes.json();
        const data = result.data?.entries || [];
        if (data.length > 0) {
          setEntries(data);
          setHasData(true);
          setConflicts(
            tab === "timetable"
              ? detectTimetableConflicts(data, sizeMap)
              : detectDatesheetConflicts(data)
          );
        } else {
          setEntries([]);
          setHasData(false);
          setConflicts([]);
        }
      } else {
        setEntries([]);
        setHasData(false);
        setConflicts([]);
      }
    } catch (err) {
      console.error("Failed to load schedule data:", err);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (tab) => {
    try {
      const res = await fetch("/api/audit-logs?limit=100");
      if (res.ok) {
        const result = await res.json();
        const list = result.data?.logs || [];
        const filtered = list.filter(log => {
          if (tab === 'timetable') {
            return log.action.includes("TIMETABLE_") || log.action === "SCHEDULE_OVERRIDE";
          } else {
            return log.action.includes("DATESHEET_") || log.action === "SCHEDULE_OVERRIDE";
          }
        }).map(log => ({
          id: log._id,
          timestamp: log.timestamp || log.createdAt,
          action: log.action,
          actor: { name: log.actorId?.name || "System", email: log.actorId?.email || "system@stmu.edu.pk" },
          description: log.metadata?.description || `${log.action} performed`
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setAuditLogs(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEdit = (entry) => {
    setSelectedSlot(entry);
    setCourseCode(entry.courseCode || "");
    setCourseName(entry.courseName || "");
    setRoom(entry.room || "");
    setInstructorOrInvigilator(entry.instructor || entry.invigilator || "");
    setBatch(entry.batch || "");
    setSlotDayOrDate(activeTab === "timetable" ? entry.day : entry.date);
    setSlotTimeOrPeriod(activeTab === "timetable" ? entry.timeSlot : entry.examSlot);
    setOverrideReason("");
    setFormError("");
    setModalOpen(true);
  };

  const handleOpenCreate = (dayOrDate, slotTime) => {
    setSelectedSlot({ id: null });
    setCourseCode("");
    setCourseName("");
    setRoom("");
    setInstructorOrInvigilator("");
    setBatch("");
    setSlotDayOrDate(dayOrDate);
    setSlotTimeOrPeriod(slotTime);
    setOverrideReason("");
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setFormError("Please state an override reason for audit logging compliance.");
      return;
    }
    if (!courseCode.trim() || !courseName.trim() || !room.trim() || !instructorOrInvigilator.trim() || !batch.trim()) {
      setFormError("All fields are required.");
      return;
    }

    // Fetch current entries from DB first
    const fetchEndpoint = activeTab === "timetable" ? "/api/scheduling/timetable" : "/api/scheduling/datesheet";
    const dataRes = await fetch(fetchEndpoint);
    let list = [];
    if (dataRes.ok) {
      const result = await dataRes.json();
      list = result.data?.entries || [];
    }

    const slotId = selectedSlot._id || selectedSlot.id;
    const index = slotId ? list.findIndex(e => e._id === slotId || e.id === slotId) : -1;

    let logDescription = "";

    const payload = {
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      room: room.trim(),
      batch: batch.trim(),
      departmentId: selectedSlot.departmentId || "60f1e03a9f1a2c3a4f89d311" // fallback departmentId
    };

    if (activeTab === "timetable") {
      payload.day = slotDayOrDate;
      payload.timeSlot = slotTimeOrPeriod;
      payload.instructor = instructorOrInvigilator.trim();
    } else {
      payload.date = slotDayOrDate;
      payload.examSlot = slotTimeOrPeriod;
      payload.invigilator = instructorOrInvigilator.trim();
    }

    if (index > -1) {
      const original = list[index];
      const updated = { ...original, ...payload };
      list[index] = updated;

      logDescription = activeTab === "timetable"
        ? `Modified timetable slot for ${updated.courseCode} (${updated.batch}) to ${updated.day} ${updated.timeSlot} (${updated.room})`
        : `Modified exam datesheet slot for ${updated.courseCode} (${updated.batch}) to ${updated.date} ${updated.examSlot} (${updated.room})`;
    } else {
      const newEntry = {
        ...payload
      };
      // Try to fetch target batch's departmentId
      const batchRes = await fetch(`/api/batches`);
      if (batchRes.ok) {
        const batchData = await batchRes.json();
        const found = (batchData.data || []).find(b => b.code.toLowerCase() === batch.trim().toLowerCase());
        if (found) newEntry.departmentId = found.departmentId;
      }
      list.push(newEntry);

      logDescription = activeTab === "timetable"
        ? `Manually mapped class slot for ${newEntry.courseCode} (${newEntry.batch}) on ${newEntry.day} at ${newEntry.timeSlot}`
        : `Manually mapped exam slot for ${newEntry.courseCode} (${newEntry.batch}) on ${newEntry.date} at ${newEntry.examSlot}`;
    }

    // Save override to backend database
    await fetch("/api/scheduling/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activeTab, entries: list })
    });

    setModalOpen(false);
    showSuccess('Override settings saved successfully.');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDelete = async () => {
    const slotId = selectedSlot._id || selectedSlot.id;
    if (!slotId) return;
 
    const confirmed = await showConfirm(
      'Delete Schedule Slot',
      'Are you sure you want to delete this schedule slot? This action cannot be undone.',
      'Delete',
      'Cancel',
      '#EF4444'
    );
    if (confirmed) {
      const fetchEndpoint = activeTab === "timetable" ? "/api/scheduling/timetable" : "/api/scheduling/datesheet";
      const dataRes = await fetch(fetchEndpoint);
      let list = [];
      if (dataRes.ok) {
        const result = await dataRes.json();
        list = result.data?.entries || [];
      }

      const index = list.findIndex(e => e._id === slotId || e.id === slotId);
      if (index > -1) {
        list.splice(index, 1);

        // Save override back to database (wipes/inserts remainder)
        await fetch("/api/scheduling/override", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: activeTab, entries: list })
        });
      }

      setModalOpen(false);
      showSuccess('Schedule override slot deleted successfully.');
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const conflictIdsSet = new Set(conflicts.flatMap((c) => c.cellIds));
  const isConflicted = (entryId) => conflictIdsSet.has(entryId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Upper Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Override Command Space</span>
          <h2 className="text-2xl font-extrabold text-[#1B3A6B] font-display mt-0.5">Schedule Manual Overrides</h2>
          <p className="text-slate-500 text-xs mt-1">
            Resolve room/faculty overlaps manually. Every override writes to the system audit trails (FR-5.4).
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold select-none self-start sm:self-center">
          <button
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === "timetable" 
                ? "bg-white text-[#1B3A6B] shadow-sm font-bold" 
                : "text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => setActiveTab("timetable")}
          >
            Class Timetable
          </button>
          <button
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === "datesheet" 
                ? "bg-white text-[#1B3A6B] shadow-sm font-bold" 
                : "text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => setActiveTab("datesheet")}
          >
            Exam Datesheet
          </button>
        </div>
      </div>

      {/* Conflicts banner (Inlined) */}
      {!hasData ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex gap-3 items-start">
          <Info className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-800">Schedule Pending Generation</h4>
            <p className="mt-0.5">Automated timetable generator must be run first before performing overrides.</p>
          </div>
        </div>
      ) : conflicts.length === 0 ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex gap-3 items-start">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-emerald-950">Schedule Status: All Clear</h4>
            <p className="mt-0.5">No overlaps or seating capacity validation conflicts exist.</p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-3">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-950">Schedule Conflict Alert ({conflicts.length} Clashes)</h4>
              <p className="mt-0.5 text-rose-700">The following overlaps exist in the schedule. Click any slot in the grid below to resolve or edit:</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
            {conflicts.map((c, idx) => (
              <div key={idx} className="p-2.5 bg-white border border-rose-200 rounded-lg shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 mb-1 inline-block">
                    {c.type}
                  </span>
                  <p className="text-[11px] font-semibold text-slate-700 leading-snug">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid rendering (Inlined) */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
          <span>Syncing override dashboard...</span>
        </div>
      ) : !hasData ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm mt-6">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 font-bold text-lg">
            🎛️
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Live Schedule Found</h3>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            Please run the automatic generators in **Timetable Generator** or **Exam Datesheet** first to seed a live schedule before performing overrides.
          </p>
        </div>
      ) : activeTab === "timetable" ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 w-44">Time Slot</th>
                {DAYS.map(day => (
                  <th key={day} className="p-4 text-center min-w-[160px]">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TIMESLOTS.map(slot => (
                <tr key={slot} className="hover:bg-slate-50/40">
                  <td className="p-4 font-semibold text-slate-600 bg-slate-50/40 border-r border-slate-100 align-middle">
                    {slot}
                  </td>
                  {DAYS.map(day => {
                    const cellEntries = entries.filter(e => e.day === day && e.timeSlot === slot);
                    return (
                      <td key={day} className="p-3 border-r border-slate-100 align-top h-36 relative group">
                        <div className="flex flex-col gap-2 h-full justify-between">
                          <div className="space-y-2 overflow-y-auto max-h-24">
                            {cellEntries.map(entry => {
                              const conflicted = isConflicted(entry._id || entry.id);
                              return (
                                <div
                                  key={entry._id || entry.id}
                                  onClick={() => handleOpenEdit(entry)}
                                  className={`p-2.5 rounded-xl border text-[10px] cursor-pointer relative hover:border-[#1B3A6B] ${
                                    conflicted
                                      ? 'bg-rose-50 border-rose-200 text-rose-955'
                                      : 'bg-indigo-50/40 border-indigo-100 text-indigo-955'
                                  }`}
                                >
                                  <div className="flex justify-between items-start font-bold">
                                    <span>{entry.courseCode}</span>
                                    <span className="px-1 bg-white border rounded text-[8px] font-mono">{entry.batch}</span>
                                  </div>
                                  <div className="truncate mt-0.5 font-medium">{entry.courseName}</div>
                                  <div className="text-[9px] text-slate-400 mt-1 flex justify-between">
                                    <span>🏫 {entry.room}</span>
                                    <span>👤 {entry.instructor.split(' ').pop()}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {cellEntries.length === 0 && (
                            <button
                              onClick={() => handleOpenCreate(day, slot)}
                              className="w-full py-1.5 rounded border border-dashed border-slate-200 hover:border-[#1B3A6B] hover:bg-[#1B3A6B]/5 text-slate-400 hover:text-[#1B3A6B] transition-all flex items-center justify-center gap-1 text-[10px] font-semibold opacity-0 group-hover:opacity-100 mt-auto h-7"
                            >
                              <Plus className="h-3 w-3" /> Add Class
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 w-44">Date</th>
                {EXAMSLOTS.map(slot => (
                  <th key={slot} className="p-4 text-center min-w-[240px]">{slot}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DATES.map(date => (
                <tr key={date} className="hover:bg-slate-50/40">
                  <td className="p-4 bg-slate-50/50 border-r border-slate-100 align-middle">
                    <div className="font-bold text-slate-800">{date}</div>
                  </td>
                  {EXAMSLOTS.map(slot => {
                    const cellEntries = entries.filter(e => e.date === date && e.examSlot === slot);
                    return (
                      <td key={slot} className="p-3 border-r border-slate-100 align-top h-36 relative group">
                        <div className="flex flex-col gap-2 h-full justify-between">
                          <div className="space-y-2 overflow-y-auto max-h-24">
                            {cellEntries.map(entry => {
                              const conflicted = isConflicted(entry._id || entry.id);
                              return (
                                <div
                                  key={entry._id || entry.id}
                                  onClick={() => handleOpenEdit(entry)}
                                  className={`p-3 rounded-xl border text-[11px] cursor-pointer relative hover:border-[#1B3A6B] ${
                                    conflicted
                                      ? 'bg-rose-50 border-rose-200 text-rose-955'
                                      : 'bg-indigo-50/40 border-indigo-100 text-indigo-955'
                                  }`}
                                >
                                  <div className="flex justify-between items-start font-bold">
                                    <span>{entry.courseCode}</span>
                                    <span className="px-1.5 py-0.25 bg-white border rounded text-[8px] font-mono">{entry.batch}</span>
                                  </div>
                                  <div className="truncate mt-0.5 font-semibold text-xs">{entry.courseName}</div>
                                  <div className="text-[9px] text-slate-400 mt-1.5 flex justify-between">
                                    <span>🏫 {entry.room}</span>
                                    <span>👤 {entry.invigilator.split(' ').pop()}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {cellEntries.length === 0 && (
                            <button
                              onClick={() => handleOpenCreate(date, slot)}
                              className="w-full py-1.5 rounded border border-dashed border-slate-200 hover:border-[#1B3A6B] hover:bg-[#1B3A6B]/5 text-slate-400 hover:text-[#1B3A6B] transition-all flex items-center justify-center gap-1 text-[10px] font-semibold opacity-0 group-hover:opacity-100 mt-auto h-7"
                            >
                              <Plus className="h-3 w-3" /> Add Exam
                            </button>
                          )}
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

      {/* Audit Log Table Log (Inlined) */}
      {!loading && hasData && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden mt-6 text-xs">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-5 w-5 text-[#1B3A6B]" />
            <h3 className="font-bold text-slate-800 uppercase tracking-wider">
              {activeTab === 'timetable' ? 'Timetable Override Audit Trail' : 'Datesheet Override Audit Trail'}
            </h3>
          </div>
          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-medium bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1">
              <Clock className="h-6 w-6 text-slate-350" />
              <span>No scheduling overrides recorded yet in this scope.</span>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 font-bold text-slate-500 uppercase tracking-wide">
                    <th className="p-3 w-36">Timestamp</th>
                    <th className="p-3 w-24">Action</th>
                    <th className="p-3 w-36">Actor</th>
                    <th className="p-3">Details / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {auditLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/40">
                      <td className="p-3 text-slate-450 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-1.5 py-0.25 text-[8px] font-extrabold rounded border tracking-wider uppercase font-mono ${
                          log.action.endsWith('_DELETE') 
                            ? 'bg-rose-50 border-rose-200 text-rose-700' 
                            : log.action.endsWith('_GENERATED') || log.action.endsWith('_COMPILED')
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {log.action.endsWith('_DELETE') ? 'DELETE' : log.action.endsWith('_GENERATED') || log.action.endsWith('_COMPILED') ? 'GENERATE' : 'OVERRIDE'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{log.actor?.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono">{log.actor?.email}</div>
                      </td>
                      <td className="p-3 leading-relaxed">
                        <p>{log.description}</p>
                        {(log.metadata?.overrideReason || log.metadata?.reason) && (
                          <p className="mt-1 text-[10px] text-slate-500 font-semibold italic">
                            Reason: "{log.metadata.overrideReason || log.metadata.reason}"
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal (Inlined) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  {selectedSlot?.day || selectedSlot?.date ? 'Modify Scheduled Slot' : 'Schedule Custom Slot'}
                </h3>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">
                  {slotDayOrDate} • {slotTimeOrPeriod}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs font-semibold">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  ⚠️ {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS-101"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">Batch Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BSCS-2023"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Programming Fundamentals"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">Room Location</label>
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Room</option>
                    {ROOMS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                    {activeTab === "timetable" ? "Instructor Name" : "Invigilator Name"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Alice Smith"
                    value={instructorOrInvigilator}
                    onChange={(e) => setInstructorOrInvigilator(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                    {activeTab === "timetable" ? "Day" : "Date"}
                  </label>
                  <select
                    value={slotDayOrDate}
                    onChange={(e) => setSlotDayOrDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:border-blue-500 outline-none bg-white"
                  >
                    {(activeTab === "timetable" ? DAYS : DATES).map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                    {activeTab === "timetable" ? "Time Slot" : "Exam Slot"}
                  </label>
                  <select
                    value={slotTimeOrPeriod}
                    onChange={(e) => setSlotTimeOrPeriod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:border-blue-500 outline-none bg-white"
                  >
                    {(activeTab === "timetable" ? TIMESLOTS : EXAMSLOTS).map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1">
                  Override Reason (Mandatory Audit Log)
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Provide technical description or reason for scheduling deviation..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                {(selectedSlot?.day || selectedSlot?.date) ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-rose-500 hover:text-rose-700 font-semibold px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Slot
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2 rounded-lg bg-slate-100 text-slate-650"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-[#1B3A6B] hover:bg-[#12284C] text-white"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleOverride;
export { ScheduleOverride };
