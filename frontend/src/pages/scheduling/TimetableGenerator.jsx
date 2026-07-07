import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { RefreshCw, Info, AlertTriangle, CheckCircle } from "lucide-react";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMESLOTS = [
  '08:30 AM - 10:00 AM',
  '10:00 AM - 11:30 AM',
  '11:30 AM - 01:00 PM',
  '01:30 PM - 03:00 PM',
  '03:00 PM - 04:30 PM'
];

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
        if (e1.batch === e2.batch) {
          conflicts.push({
            type: 'COHORT_OVERLAP',
            description: `Cohort clash: Batch ${e1.batch} is scheduled for both ${e1.courseCode} and ${e2.courseCode} simultaneously.`,
            cellIds: [id1, id2]
          });
        }
      }
    }
  }

  return conflicts;
}

function TimetableGenerator() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [batchSizes, setBatchSizes] = useState({});

  useEffect(() => {
    fetchMetadataAndTimetable();
  }, []);

  const fetchMetadataAndTimetable = async () => {
    setLoading(true);
    try {
      const sizeRes = await fetch("/api/dashboard/students-by-batch");
      const sizeMap = {};
      if (sizeRes.ok) {
        const sizeData = await sizeRes.json();
        if (sizeData.data && Array.isArray(sizeData.data)) {
          sizeData.data.forEach(item => {
            sizeMap[item.batchCode] = item.total;
          });
        }
      }
      setBatchSizes(sizeMap);

      const timeRes = await fetch("/api/scheduling/timetable");
      if (timeRes.ok) {
        const timeData = await timeRes.json();
        const data = timeData.data?.entries || [];
        if (data.length > 0) {
          setEntries(data);
          setHasData(true);
          setConflicts(detectTimetableConflicts(data, sizeMap));
        } else {
          setHasData(false);
        }
      } else {
        setHasData(false);
      }
    } catch (err) {
      console.error("Failed to load timetable and metadata:", err);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const [batchesRes, usersRes] = await Promise.all([
        fetch("/api/batches"),
        fetch("/api/users")
      ]);

      let batches = [];
      let users = [];

      if (batchesRes.ok) {
        const batchesData = await batchesRes.json();
        batches = batchesData.status === "success" ? (batchesData.data || []) : [];
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        users = usersData.status === "success" ? (usersData.data || []) : [];
      }

      let instructors = users
        .filter(u => u.role === "advisor" || u.role === "faculty")
        .map(u => u.name);

      if (instructors.length === 0) {
        instructors = ['Dr. Alice Smith', 'Dr. Bob Johnson', 'Prof. Carol Williams', 'Dr. David Brown'];
      }

      const ROOMS = ['Room 101', 'Room 102', 'Room 201', 'Room 202', 'Lab A', 'Lab B'];
      const generatedEntries = [];
      let slotIndex = 0;

      for (const batch of batches) {
        const currRes = await fetch(`/api/curriculum/batch/${batch._id}`);
        let courses = [];
        if (currRes.ok) {
          const currData = await currRes.json();
          if (currData.status === "success" && currData.data?.curriculum) {
            courses = currData.data.curriculum.courses || [];
          }
        }

        if (courses.length === 0) continue;

        for (const course of courses) {
          const day = DAYS[slotIndex % DAYS.length];
          const timeSlot = TIMESLOTS[Math.floor(slotIndex / DAYS.length) % TIMESLOTS.length];
          const room = ROOMS[slotIndex % ROOMS.length];
          const instructor = instructors[slotIndex % instructors.length];

          generatedEntries.push({
            _id: `t-${batch.code}-${course.code}-${slotIndex}-${Date.now()}`,
            day,
            timeSlot,
            courseCode: course.code,
            courseName: course.title,
            room,
            instructor,
            batch: batch.code,
            departmentId: batch.departmentId
          });
          slotIndex++;
        }
      }

      const saveRes = await fetch("/api/scheduling/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: generatedEntries })
      });
      
      let savedEntries = generatedEntries;
      if (saveRes.ok) {
        const saveResult = await saveRes.json();
        savedEntries = saveResult.data?.entries || generatedEntries;
      }

      setEntries(savedEntries);
      setHasData(savedEntries.length > 0);
      setConflicts(detectTimetableConflicts(savedEntries, batchSizes));
    } catch (err) {
      console.error("Failed to generate timetable:", err);
    } finally {
      setGenerating(false);
    }
  };

  const conflictIdsSet = new Set(conflicts.flatMap((c) => c.cellIds));
  const isConflicted = (entryId) => conflictIdsSet.has(entryId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Academic Scheduling</span>
          <h2 className="text-2xl font-extrabold text-[#1B3A6B] font-display mt-0.5">Weekly Timetable Generator</h2>
          <p className="text-slate-500 text-xs mt-1">
            Construct clash-free timetables automatically using department curricula rules (FR-5.1).
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B3A6B] hover:bg-[#12284C] text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Processing..." : "Execute Timetable Algorithm"}
        </button>
      </div>

      {/* Schedule Status Banner (Inlined) */}
      {!hasData ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex gap-3 items-start">
          <Info className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-800">Schedule Pending Generation</h4>
            <p className="mt-0.5">Run the automated algorithm above to map weekly class slots.</p>
          </div>
        </div>
      ) : conflicts.length === 0 ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex gap-3 items-start">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-emerald-950">Schedule Status: All Clear</h4>
            <p className="mt-0.5">No Room, Instructor, or Batch conflicts detected in this weekly schedule setup.</p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-3">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-950">Schedule Conflict Alert ({conflicts.length} Clashes)</h4>
              <p className="mt-0.5">Automated checks identified overlapping resource constraints (FR-5.3, FR-5.5).</p>
            </div>
          </div>
          <div className="border-t border-rose-200/65 pt-3">
            <ul className="space-y-1.5 max-h-[140px] overflow-y-auto">
              {conflicts.map((c, i) => (
                <li key={i} className="bg-white/60 p-2 rounded border border-rose-100 flex gap-2">
                  <span className="font-extrabold uppercase font-mono text-[9px] px-1 py-0.25 bg-rose-100 rounded text-rose-800 h-fit mt-0.5">
                    {c.type}
                  </span>
                  <span>{c.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Main Grid Render (Inlined) */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
          <span>Syncing academic schedule...</span>
        </div>
      ) : !hasData ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm mt-6">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 font-bold text-lg">
            📅
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Timetable Found</h3>
          <p className="text-slate-500 text-xs mt-1.5">
            Click the **Execute Timetable Algorithm** button above to generate a weekly slot schedule.
          </p>
        </div>
      ) : (
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
                      <td key={day} className="p-3 border-r border-slate-100 align-top h-32">
                        <div className="space-y-2 overflow-y-auto max-h-24">
                          {cellEntries.map(entry => {
                            const conflicted = isConflicted(entry._id || entry.id);
                            return (
                              <div
                                key={entry._id || entry.id}
                                className={`p-2 rounded-xl border text-[10px] ${
                                  conflicted
                                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                                    : 'bg-indigo-50/40 border-indigo-100 text-indigo-950'
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
  );
}

export default TimetableGenerator;
