import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { RefreshCw, Info, AlertTriangle, CheckCircle } from "lucide-react";

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

  const fetchExistingDatesheet = async () => {
    setLoading(true);
    try {
      const dateRes = await fetch("/api/scheduling/datesheet");
      if (dateRes.ok) {
        const dateData = await dateRes.json();
        const data = dateData.data?.entries || [];
        if (data.length > 0) {
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

      let invigilators = users
        .filter(u => u.role === "advisor" || u.role === "faculty" || u.role === "academic_admin")
        .map(u => u.name);

      if (invigilators.length === 0) {
        invigilators = ['Dr. Alice Smith', 'Dr. Bob Johnson', 'Prof. Carol Williams', 'Dr. David Brown'];
      }

      const ROOMS = ['Room 101', 'Room 102', 'Room 201', 'Room 202', 'Exam Hall'];

      const generatedEntries = [];
      let examIndex = 0;

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
          const date = DATES[examIndex % DATES.length];
          const examSlot = EXAMSLOTS[Math.floor(examIndex / DATES.length) % EXAMSLOTS.length];
          const room = ROOMS[examIndex % ROOMS.length];
          const invigilator = invigilators[examIndex % invigilators.length];

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

      const saveRes = await fetch("/api/scheduling/datesheet", {
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
      setConflicts(detectDatesheetConflicts(savedEntries));
    } catch (err) {
      console.error("Failed to compile datesheet:", err);
    } finally {
      setGenerating(false);
    }
  };

  const conflictIdsSet = new Set(conflicts.flatMap((c) => c.cellIds));
  const isConflicted = (entryId) => conflictIdsSet.has(entryId);

  const formatDate = (dateStr) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Exam Management</span>
          <h2 className="text-2xl font-extrabold text-[#1B3A6B] mt-0.5">Exam Datesheet Compiler</h2>
          <p className="text-slate-500 text-xs mt-1">
            Generate exam schedules automatically and validate room/invigilator allocations (FR-5.2).
          </p>
        </div>
        <button
          onClick={handleCompile}
          disabled={generating}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B3A6B] hover:bg-[#12284C] text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Processing..." : "Compile Exam Datesheet"}
        </button>
      </div>

      {/* Schedule Status Banner (Inlined) */}
      {!hasData ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex gap-3 items-start">
          <Info className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-800">Schedule Pending Generation</h4>
            <p className="mt-0.5">Run the automated algorithm above to compile the datesheet.</p>
          </div>
        </div>
      ) : conflicts.length === 0 ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex gap-3 items-start">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-emerald-950">Schedule Status: All Clear</h4>
            <p className="mt-0.5">No Room, Invigilator, or Student cohort overlaps found in this exam schedule setup.</p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-3">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-950">Schedule Conflict Alert ({conflicts.length} Clashes)</h4>
              <p className="mt-0.5">Automated checks identified exam date/slot overlaps (FR-5.3).</p>
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
          <span>Syncing exam datesheet...</span>
        </div>
      ) : !hasData ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm mt-6">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 font-bold text-lg">
            📝
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Datesheet Found</h3>
          <p className="text-slate-500 text-xs mt-1.5">
            Click the **Compile Exam Datesheet** button above to generate a datesheet.
          </p>
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
                    <div className="font-bold text-slate-800">{formatDate(date)}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{date}</div>
                  </td>
                  {EXAMSLOTS.map(slot => {
                    const cellEntries = entries.filter(e => e.date === date && e.examSlot === slot);
                    return (
                      <td key={slot} className="p-3 border-r border-slate-100 align-top h-32">
                        <div className="space-y-2 overflow-y-auto max-h-24">
                          {cellEntries.map(entry => {
                            const conflicted = isConflicted(entry._id || entry.id);
                            return (
                              <div
                                key={entry._id || entry.id}
                                className={`p-3 rounded-xl border text-[11px] ${
                                  conflicted
                                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                                    : 'bg-indigo-50/40 border-indigo-100 text-indigo-950'
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

export default DatesheetGenerator;
export { DatesheetGenerator };
