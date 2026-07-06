import React, { useState, useEffect } from "react";
import { RefreshCw, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

// Inline conflict detector
function detectDatesheetConflicts(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const conflicts = [];
  const n = entries.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.date === b.date && a.examSlot === b.examSlot) {
        const idA = a._id || a.id;
        const idB = b._id || b.id;
        if (a.room && b.room && a.room.trim().toLowerCase() === b.room.trim().toLowerCase()) {
          conflicts.push({
            type: 'room',
            cellIds: [idA, idB],
            description: `Exam Room "${a.room}" is double-booked on ${a.date} at ${a.examSlot} for ${a.courseCode} (${a.batch}) and ${b.courseCode} (${b.batch}).`
          });
        }
        if (a.invigilator && b.invigilator && a.invigilator.trim().toLowerCase() === b.invigilator.trim().toLowerCase()) {
          conflicts.push({
            type: 'invigilator',
            cellIds: [idA, idB],
            description: `Invigilator "${a.invigilator}" is scheduled twice on ${a.date} at ${a.examSlot} (Courses: ${a.courseCode} for ${a.batch}, ${b.courseCode} for ${b.batch}).`
          });
        }
        if (a.batch && b.batch && a.batch.trim().toLowerCase() === b.batch.trim().toLowerCase()) {
          conflicts.push({
            type: 'batch',
            cellIds: [idA, idB],
            description: `Batch "${a.batch}" has multiple exams scheduled on ${a.date} at ${a.examSlot} (Courses: ${a.courseCode} in ${a.room}, ${b.courseCode} in ${b.room}).`
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

// Inline DatesheetGrid
function DatesheetGrid({ entries = [], isConflicted = () => false }) {
  const EXAMSLOTS = [
    '09:00 AM - 12:00 PM',
    '02:00 PM - 05:00 PM'
  ];
  const DATES = [
    '2026-07-13',
    '2026-07-14',
    '2026-07-15',
    '2026-07-16',
    '2026-07-17',
    '2026-07-20',
    '2026-07-21',
    '2026-07-22',
    '2026-07-23',
    '2026-07-24'
  ];

  const getEntriesForCell = (date, slot) => {
    return entries.filter(e => e.date === date && e.examSlot === slot);
  };

  const formatDate = (dateStr) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 w-44">Date</th>
            {EXAMSLOTS.map(slot => (
              <th key={slot} className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center min-w-80">
                {slot}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {DATES.map(date => (
            <tr key={date} className="hover:bg-slate-50/40 transition-colors">
              <td className="p-4 bg-slate-50/50 align-middle border-r border-slate-100">
                <div className="font-bold text-slate-800 text-xs tracking-wide">{formatDate(date)}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{date}</div>
              </td>
              {EXAMSLOTS.map(slot => {
                const cellEntries = getEntriesForCell(date, slot);
                return (
                  <td key={slot} className="p-3 align-top border-r border-slate-100 h-36">
                    <div className="space-y-2 overflow-y-auto max-h-28 pr-1">
                      {cellEntries.map(entry => {
                        const conflicted = isConflicted(entry._id || entry.id);
                        return (
                          <div
                            key={entry._id || entry.id}
                            className={`p-3 rounded-xl border text-[11px] relative ${
                              conflicted
                                ? 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-sm shadow-rose-100'
                                : 'bg-indigo-50/50 border-indigo-100 text-indigo-900'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-0.5">
                              <span className="font-extrabold font-mono tracking-tight text-xs">{entry.courseCode}</span>
                              <span className="px-1.5 py-0.25 rounded bg-white border border-slate-200/80 text-[9px] font-bold text-slate-600 uppercase font-mono tracking-wider">
                                {entry.batch}
                              </span>
                            </div>
                            <div className="font-semibold truncate max-w-[200px] text-xs">{entry.courseName}</div>
                            <div className="text-[10px] text-slate-500 font-medium mt-1 flex justify-between">
                              <span>🏫 {entry.room}</span>
                              <span>👤 Invigilator: {entry.invigilator.split(' ').pop()}</span>
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

function DatesheetGenerator() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchExistingDatesheet();
  }, []);

  const fetchExistingDatesheet = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("batchminder_datesheet_entries");
      if (stored) {
        const data = JSON.parse(stored);
        if (data && data.length > 0) {
          setEntries(data);
          setHasData(true);
          setConflicts(detectDatesheetConflicts(data));
        } else {
          setHasData(false);
        }
      } else {
        setHasData(false);
      }
    } catch (err) {
      console.error("Failed to load datesheet:", err);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCompile = async () => {
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

      const DATES = [
        '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17',
        '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'
      ];
      const EXAMSLOTS = [
        '09:00 AM - 12:00 PM',
        '02:00 PM - 05:00 PM'
      ];
      const ROOMS = ['Room 101', 'Room 102', 'Room 201', 'Room 202', 'Exam Hall'];
      const INVIGILATORS = [
        'Dr. Alice Smith',
        'Dr. Bob Johnson',
        'Prof. Carol Williams',
        'Dr. David Brown',
        'Prof. Emily Davis',
        'Dr. Frank Miller'
      ];

      const generatedEntries = [];
      let examIndex = 0;

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
          const date = DATES[examIndex % DATES.length];
          const examSlot = EXAMSLOTS[Math.floor(examIndex / DATES.length) % EXAMSLOTS.length];
          const room = ROOMS[examIndex % ROOMS.length];
          const invigilator = INVIGILATORS[examIndex % (INVIGILATORS.length - 1)]; 

          generatedEntries.push({
            _id: `e-${batch.code}-${course.code}-${examIndex}-${Date.now()}`,
            date,
            examSlot,
            courseCode: course.code,
            courseName: course.title,
            room,
            invigilator,
            batch: batch.code,
            departmentId: batch.departmentId
          });
          examIndex++;
        }
      }

      localStorage.setItem("batchminder_datesheet_entries", JSON.stringify(generatedEntries));

      const oldLogsStr = localStorage.getItem("batchminder_audit_logs");
      const logs = oldLogsStr ? JSON.parse(oldLogsStr) : [];
      logs.push({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: "DATESHEET_COMPILED",
        actor: { name: user?.name || "System", email: user?.email || "system@stmu.edu.pk" },
        description: `Compiled new exam datesheet schedule with ${generatedEntries.length} entries dynamically.`
      });
      localStorage.setItem("batchminder_audit_logs", JSON.stringify(logs));

      setEntries(generatedEntries);
      setHasData(generatedEntries.length > 0);
      setConflicts(detectDatesheetConflicts(generatedEntries));
    } catch (err) {
      console.error("Failed to compile datesheet:", err);
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
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Exam Management</span>
          <h2 className="text-2xl font-extrabold text-[#1B3A6B] mt-0.5">Exam Datesheet Compiler</h2>
          <p className="text-slate-500 text-xs mt-1">
            Generate exam schedules automatically and validate room/invigilator allocations (FR-5.2).
          </p>
        </div>
        <GenerateButton
          onClick={handleCompile}
          loading={generating}
          label="Compile Exam Datesheet"
        />
      </div>

      <ScheduleStatusBanner conflicts={conflicts} hasData={hasData} />

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
          <span>Syncing exam datesheet...</span>
        </div>
      ) : !hasData ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm mt-6">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            📝
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Datesheet Found</h3>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            No active exam datesheets have been compiled for this department scope. Click the **Compile Exam Datesheet** button above to generate a datesheet.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <DatesheetGrid entries={entries} isConflicted={isConflicted} />
        </div>
      )}
    </div>
  );
}

export default DatesheetGenerator;
