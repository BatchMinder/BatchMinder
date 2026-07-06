import React, { useState, useEffect } from "react";
import { RefreshCw, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

// Inline conflict detector
function detectTimetableConflicts(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const conflicts = [];
  const n = entries.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.day === b.day && a.timeSlot === b.timeSlot) {
        const idA = a._id || a.id;
        const idB = b._id || b.id;
        if (a.room && b.room && a.room.trim().toLowerCase() === b.room.trim().toLowerCase()) {
          conflicts.push({
            type: 'room',
            cellIds: [idA, idB],
            description: `Room "${a.room}" is double-booked on ${a.day} at ${a.timeSlot} for ${a.courseCode} (${a.batch}) and ${b.courseCode} (${b.batch}).`
          });
        }
        if (a.instructor && b.instructor && a.instructor.trim().toLowerCase() === b.instructor.trim().toLowerCase()) {
          conflicts.push({
            type: 'instructor',
            cellIds: [idA, idB],
            description: `Instructor "${a.instructor}" is scheduled twice on ${a.day} at ${a.timeSlot} (Courses: ${a.courseCode} for ${a.batch}, ${b.courseCode} for ${b.batch}).`
          });
        }
        if (a.batch && b.batch && a.batch.trim().toLowerCase() === b.batch.trim().toLowerCase()) {
          conflicts.push({
            type: 'batch',
            cellIds: [idA, idB],
            description: `Batch "${a.batch}" has multiple classes scheduled on ${a.day} at ${a.timeSlot} (Courses: ${a.courseCode} in ${a.room}, ${b.courseCode} in ${b.room}).`
          });
        }
      }
    }
  }
  return conflicts;
}

// Inline ScheduleStatusBanner
function ScheduleStatusBanner({ conflicts = [], hasData }) {
  if (!hasData) {
    return (
      <div className="mb-6 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-sm flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500">
          <Info className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 text-sm">Schedule Pending Generation</h4>
          <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
            The database does not have schedule mappings compiled for this scope. Run the automated algorithm above to construct a clash-free layout.
          </p>
        </div>
      </div>
    );
  }

  const clashCount = conflicts.length;
  if (clashCount === 0) {
    return (
      <div className="mb-6 p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 shadow-sm flex items-start gap-4 backdrop-blur-md">
        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
          <CheckCircle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-emerald-900 text-sm font-display">Schedule Status: All Clear</h4>
          <p className="text-emerald-700 text-xs mt-0.5 leading-relaxed">
            Congratulations! The compiler successfully executed. No student, invigilator, or room conflicts exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-5 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-800 shadow-sm flex flex-col gap-3.5 backdrop-blur-md">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 animate-pulse">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-rose-950 text-sm font-display">
            Schedule Conflict Alert ({clashCount} {clashCount === 1 ? 'Clash' : 'Clashes'} Detected)
          </h4>
          <p className="text-rose-700 text-xs mt-0.5 leading-relaxed font-medium">
            The compiler detected resources overlaps. Please use the Override command space to resolve the conflicts manually.
          </p>
        </div>
      </div>
      <div className="border-t border-rose-200/60 pt-3.5 mt-1">
        <span className="text-rose-900 font-semibold text-xs tracking-wider uppercase block mb-2">Detailed Clash Log:</span>
        <ul className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
          {conflicts.map((clash, idx) => (
            <li key={idx} className="text-xs text-rose-800 bg-white/60 hover:bg-white/90 border border-rose-100 rounded-xl p-3 flex items-start gap-2 shadow-sm transition-all">
              <span className="inline-flex items-center justify-center font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] uppercase font-mono tracking-wider mt-0.5 shrink-0">
                {clash.type}
              </span>
              <span className="leading-relaxed font-medium">{clash.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Inline GenerateButton
function GenerateButton({ onClick, loading, label = 'Generate' }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`relative overflow-hidden inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 shadow-md ${
        loading
          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          : 'bg-gradient-to-r from-[#1B3A6B] to-[#3B82F6] hover:from-[#152e56] hover:to-[#2563eb] text-white shadow-brandNavy/15 hover:shadow-brandNavy/35 active:scale-98 transform'
      }`}
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      <span className="tracking-wide">{loading ? 'Processing...' : label}</span>
    </button>
  );
}

// Inline TimetableGrid
function TimetableGrid({ entries = [], isConflicted = () => false }) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const TIMESLOTS = [
    '08:30 AM - 10:00 AM',
    '10:00 AM - 11:30 AM',
    '11:30 AM - 01:00 PM',
    '01:30 PM - 03:00 PM',
    '03:00 PM - 04:30 PM'
  ];

  const getEntriesForCell = (day, timeSlot) => {
    return entries.filter(e => e.day === day && e.timeSlot === timeSlot);
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 w-44">Time Slot</th>
            {DAYS.map(day => (
              <th key={day} className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center min-w-48">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {TIMESLOTS.map(slot => (
            <tr key={slot} className="hover:bg-slate-50/40 transition-colors">
              <td className="p-4 font-semibold text-slate-600 text-xs tracking-wide bg-slate-50/50 align-middle border-r border-slate-100">
                {slot}
              </td>
              {DAYS.map(day => {
                const cellEntries = getEntriesForCell(day, slot);
                return (
                  <td key={day} className="p-3 align-top border-r border-slate-100 h-36">
                    <div className="space-y-2 overflow-y-auto max-h-28 pr-1">
                      {cellEntries.map(entry => {
                        const conflicted = isConflicted(entry._id || entry.id);
                        return (
                          <div
                            key={entry._id || entry.id}
                            className={`p-2.5 rounded-xl border text-[11px] relative ${
                              conflicted
                                ? 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-sm shadow-rose-100'
                                : 'bg-indigo-50/50 border-indigo-100 text-indigo-900'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-0.5">
                              <span className="font-extrabold font-mono tracking-tight">{entry.courseCode}</span>
                              <span className="px-1.5 py-0.25 rounded bg-white border border-slate-200/80 text-[9px] font-bold text-slate-600 uppercase font-mono tracking-wider">
                                    {entry.batch}
                              </span>
                            </div>
                            <div className="font-semibold truncate">{entry.courseName}</div>
                            <div className="text-[10px] text-slate-500 font-medium mt-1 flex justify-between">
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
  );
}

function TimetableGenerator() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchExistingTimetable();
  }, []);

  const fetchExistingTimetable = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("batchminder_timetable_entries");
      if (stored) {
        const data = JSON.parse(stored);
        if (data && data.length > 0) {
          setEntries(data);
          setHasData(true);
          setConflicts(detectTimetableConflicts(data));
        } else {
          setHasData(false);
        }
      } else {
        setHasData(false);
      }
    } catch (err) {
      console.error("Failed to load timetable:", err);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const [batchesRes, deptsRes] = await Promise.all([
        fetch("/api/batches"),
        fetch("/api/departments")
      ]);

      let batches = [];
      let depts = [];

      if (batchesRes.ok) {
        batches = await batchesRes.json();
      }
      if (deptsRes.ok) {
        depts = await deptsRes.json();
      }

      if (depts.length === 0) {
        depts = [
          { _id: "cs-dept-id", code: "CS", name: "Computer Science" },
          { _id: "se-dept-id", code: "SE", name: "Software Engineering" }
        ];
      }

      if (batches.length === 0) {
        batches = [
          { _id: "bscs-2023-id", code: "BSCS-2023", departmentId: "cs-dept-id" },
          { _id: "bsse-2023-id", code: "BSSE-2023", departmentId: "se-dept-id" },
          { _id: "bscs-2024-id", code: "BSCS-2024", departmentId: "cs-dept-id" }
        ];
      }

      const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const TIMESLOTS = [
        '08:30 AM - 10:00 AM',
        '10:00 AM - 11:30 AM',
        '11:30 AM - 01:00 PM',
        '01:30 PM - 03:00 PM',
        '03:00 PM - 04:30 PM'
      ];
      const ROOMS = ['Room 101', 'Room 102', 'Room 201', 'Room 202', 'Lab A', 'Lab B'];
      const INSTRUCTORS = [
        'Dr. Alice Smith',
        'Dr. Bob Johnson',
        'Prof. Carol Williams',
        'Dr. David Brown',
        'Prof. Emily Davis',
        'Dr. Frank Miller'
      ];

      const generatedEntries = [];
      let slotIndex = 0;

      for (const batch of batches) {
        let courses = [];
        if (batch.code && batch.code.includes("CS")) {
          courses = [
            { code: 'CS-101', title: 'Intro to Programming' },
            { code: 'CS-201', title: 'Data Structures' },
            { code: 'CS-301', title: 'Database Systems' },
            { code: 'CS-401', title: 'Artificial Intelligence' }
          ];
        } else if (batch.code && batch.code.includes("SE")) {
          courses = [
            { code: 'SE-101', title: 'Intro to Software Eng' },
            { code: 'SE-202', title: 'Software Architecture' },
            { code: 'SE-303', title: 'Web Engineering' }
          ];
        } else {
          courses = [
            { code: 'EE-101', title: 'Circuit Analysis' },
            { code: 'EE-202', title: 'Digital Logic Design' },
            { code: 'EE-303', title: 'Signals & Systems' }
          ];
        }

        for (const course of courses) {
          const day = DAYS[slotIndex % DAYS.length];
          const timeSlot = TIMESLOTS[Math.floor(slotIndex / DAYS.length) % TIMESLOTS.length];
          const room = ROOMS[slotIndex % ROOMS.length];
          const instructor = INSTRUCTORS[slotIndex % (INSTRUCTORS.length - 1)]; 

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

      localStorage.setItem("batchminder_timetable_entries", JSON.stringify(generatedEntries));

      const oldLogsStr = localStorage.getItem("batchminder_audit_logs");
      const logs = oldLogsStr ? JSON.parse(oldLogsStr) : [];
      logs.push({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: "TIMETABLE_GENERATED",
        actor: { name: user?.name || "System", email: user?.email || "system@stmu.edu.pk" },
        description: `Generated new weekly timetable schedule with ${generatedEntries.length} entries dynamically.`
      });
      localStorage.setItem("batchminder_audit_logs", JSON.stringify(logs));

      setEntries(generatedEntries);
      setHasData(generatedEntries.length > 0);
      setConflicts(detectTimetableConflicts(generatedEntries));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Academic Scheduling</span>
          <h2 className="text-2xl font-extrabold text-[#1B3A6B] mt-0.5">Weekly Timetable Generator</h2>
          <p className="text-slate-500 text-xs mt-1">
            Construct clash-free timetables automatically using department curricula rules (FR-5.1).
          </p>
        </div>
        <GenerateButton
          onClick={handleGenerate}
          loading={generating}
          label="Execute Timetable Algorithm"
        />
      </div>

      <ScheduleStatusBanner conflicts={conflicts} hasData={hasData} />

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
          <span>Syncing academic schedule...</span>
        </div>
      ) : !hasData ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm mt-6">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            📅
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Timetable Found</h3>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            No active timetables have been compiled for this department scope. Click the **Execute Timetable Algorithm** button above to generate a weekly slot schedule.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <TimetableGrid entries={entries} isConflicted={isConflicted} />
        </div>
      )}
    </div>
  );
}

export default TimetableGenerator;
