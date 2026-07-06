import React, { useState, useEffect } from "react";
import { Edit2, Plus, Trash2, X, Info, CheckCircle, AlertTriangle, ClipboardList, Clock } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

// Inline conflict detectors
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

// Inline TimetableGrid
function TimetableGrid({ entries = [], isConflicted = () => false, editable = false, onSlotUpdate }) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const TIMESLOTS = [
    '08:30 AM - 10:00 AM',
    '10:00 AM - 11:30 AM',
    '11:30 AM - 01:00 PM',
    '01:30 PM - 03:00 PM',
    '03:00 PM - 04:30 PM'
  ];

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [formError, setFormError] = useState('');

  // Form states
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [room, setRoom] = useState('');
  const [instructor, setInstructor] = useState('');
  const [batch, setBatch] = useState('');
  const [dayVal, setDayVal] = useState('');
  const [timeVal, setTimeVal] = useState('');

  const getEntriesForCell = (day, timeSlot) => {
    return entries.filter(e => e.day === day && e.timeSlot === timeSlot);
  };

  const handleOpenEdit = (entry) => {
    if (!editable) return;
    setSelectedSlot(entry);
    setCourseCode(entry.courseCode || '');
    setCourseName(entry.courseName || '');
    setRoom(entry.room || '');
    setInstructor(entry.instructor || '');
    setBatch(entry.batch || '');
    setDayVal(entry.day);
    setTimeVal(entry.timeSlot);
    setOverrideReason('');
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenCreate = (day, timeSlot) => {
    if (!editable) return;
    setSelectedSlot({ id: null, day, timeSlot });
    setCourseCode('');
    setCourseName('');
    setRoom('');
    setInstructor('');
    setBatch('');
    setDayVal(day);
    setTimeVal(timeSlot);
    setOverrideReason('');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setFormError('Please provide a valid override reason for the audit logs.');
      return;
    }
    if (!courseCode.trim() || !courseName.trim() || !room.trim() || !instructor.trim() || !batch.trim()) {
      setFormError('All fields are required.');
      return;
    }

    const payload = {
      id: selectedSlot.id || selectedSlot._id || null,
      day: dayVal,
      timeSlot: timeVal,
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      room: room.trim(),
      instructor: instructor.trim(),
      batch: batch.trim()
    };

    try {
      await onSlotUpdate(payload, overrideReason);
      setModalOpen(false);
    } catch (err) {
      setFormError('Failed to save timetable change.');
    }
  };

  const handleDelete = async () => {
    const slotId = selectedSlot.id || selectedSlot._id;
    if (!slotId) return;

    if (window.confirm('Are you sure you want to delete this timetable slot?')) {
      try {
        await onSlotUpdate({ id: slotId, _delete: true }, 'Deleted slot');
        setModalOpen(false);
      } catch (err) {
        setFormError('Delete request failed.');
      }
    }
  };

  return (
    <div className="relative">
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
                    <td key={day} className="p-3 align-top border-r border-slate-100 relative group h-36">
                      <div className="flex flex-col gap-2 h-full justify-between">
                        <div className="space-y-2 overflow-y-auto max-h-28 pr-1">
                          {cellEntries.map(entry => {
                            const conflicted = isConflicted(entry._id || entry.id);
                            return (
                              <div
                                key={entry._id || entry.id}
                                onClick={() => handleOpenEdit(entry)}
                                className={`p-2.5 rounded-xl border transition-all text-[11px] relative cursor-pointer ${
                                  conflicted
                                    ? 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-sm shadow-rose-100 animate-pulse-slow'
                                    : 'bg-indigo-50/50 border-indigo-100 text-indigo-900 hover:border-indigo-200'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-0.5">
                                  <span className="font-extrabold font-mono tracking-tight">{entry.courseCode}</span>
                                  <span className="px-1.5 py-0.25 rounded bg-white border border-slate-200/80 text-[9px] font-bold text-slate-600 uppercase font-mono tracking-wider">
                                    {entry.batch}
                                  </span>
                                </div>
                                <div className="font-semibold truncate max-w-[150px]">{entry.courseName}</div>
                                <div className="text-[10px] text-slate-500 font-medium mt-1 flex justify-between">
                                  <span>🏫 {entry.room}</span>
                                  <span>👤 {entry.instructor.split(' ').pop()}</span>
                                </div>
                                {editable && (
                                  <span className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-md border border-slate-200 shadow-sm text-slate-450">
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {editable && cellEntries.length === 0 && (
                          <button
                            onClick={() => handleOpenCreate(day, slot)}
                            className="w-full py-2.5 rounded-xl border border-dashed border-slate-200 hover:border-[#3B82F6] hover:bg-blue-50/20 text-slate-400 hover:text-[#3B82F6] transition-all flex items-center justify-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 h-10 mt-auto"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Class
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden transform scale-100 transition-all duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedSlot?.id || selectedSlot?._id ? 'Modify Scheduled Slot' : 'Schedule Custom Slot'}
                </h3>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">
                  {dayVal} • {timeVal}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  ⚠️ {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS-101"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Batch Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BSCS-2023"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Programming Fundamentals"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Room Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 101"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Instructor Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Alice Smith"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Day</label>
                  <select
                    value={dayVal}
                    onChange={(e) => setDayVal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-all"
                  >
                    {DAYS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Time Slot</label>
                  <select
                    value={timeVal}
                    onChange={(e) => setTimeVal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-all"
                  >
                    {TIMESLOTS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Override Reason (Mandatory)</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Provide technical description..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                {(selectedSlot?.id || selectedSlot?._id) ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-rose-500 hover:text-rose-700 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors"
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
                    className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md"
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

// Inline DatesheetGrid
function DatesheetGrid({ entries = [], isConflicted = () => false, editable = false, onSlotUpdate }) {
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

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [formError, setFormError] = useState('');

  // Form states
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [room, setRoom] = useState('');
  const [invigilator, setInvigilator] = useState('');
  const [batch, setBatch] = useState('');
  const [dateVal, setDateVal] = useState('');
  const [slotVal, setSlotVal] = useState('');

  const getEntriesForCell = (date, slot) => {
    return entries.filter(e => e.date === date && e.examSlot === slot);
  };

  const handleOpenEdit = (entry) => {
    if (!editable) return;
    setSelectedSlot(entry);
    setCourseCode(entry.courseCode || '');
    setCourseName(entry.courseName || '');
    setRoom(entry.room || '');
    setInvigilator(entry.invigilator || '');
    setBatch(entry.batch || '');
    setDateVal(entry.date);
    setSlotVal(entry.examSlot);
    setOverrideReason('');
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenCreate = (date, slot) => {
    if (!editable) return;
    setSelectedSlot({ id: null, date, examSlot: slot });
    setCourseCode('');
    setCourseName('');
    setRoom('');
    setInvigilator('');
    setBatch('');
    setDateVal(date);
    setSlotVal(slot);
    setOverrideReason('');
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setFormError('Please provide a valid override reason.');
      return;
    }
    if (!courseCode.trim() || !courseName.trim() || !room.trim() || !invigilator.trim() || !batch.trim()) {
      setFormError('All fields are required.');
      return;
    }

    const payload = {
      id: selectedSlot.id || selectedSlot._id || null,
      date: dateVal,
      examSlot: slotVal,
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      room: room.trim(),
      invigilator: invigilator.trim(),
      batch: batch.trim()
    };

    try {
      await onSlotUpdate(payload, overrideReason);
      setModalOpen(false);
    } catch (err) {
      setFormError('Failed to save datesheet change.');
    }
  };

  const handleDelete = async () => {
    const slotId = selectedSlot.id || selectedSlot._id;
    if (!slotId) return;

    if (window.confirm('Are you sure you want to delete this exam slot?')) {
      try {
        await onSlotUpdate({ id: slotId, _delete: true }, 'Deleted exam slot');
        setModalOpen(false);
      } catch (err) {
        setFormError('Delete failed.');
      }
    }
  };

  const formatDate = (dateStr) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  return (
    <div className="relative">
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
                    <td key={slot} className="p-3 align-top border-r border-slate-100 relative group h-36">
                      <div className="flex flex-col gap-2 h-full justify-between">
                        <div className="space-y-2 overflow-y-auto max-h-28 pr-1">
                          {cellEntries.map(entry => {
                            const conflicted = isConflicted(entry._id || entry.id);
                            return (
                              <div
                                key={entry._id || entry.id}
                                onClick={() => handleOpenEdit(entry)}
                                className={`p-3 rounded-xl border text-[11px] relative cursor-pointer ${
                                  conflicted
                                    ? 'bg-rose-50/95 border-rose-200 text-rose-900 shadow-sm shadow-rose-100'
                                    : 'bg-indigo-50/50 border-indigo-100 text-indigo-900 hover:border-indigo-200'
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
                                {editable && (
                                  <span className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-md border border-slate-200 shadow-sm text-slate-450">
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {editable && cellEntries.length === 0 && (
                          <button
                            onClick={() => handleOpenCreate(date, slot)}
                            className="w-full py-2.5 rounded-xl border border-dashed border-slate-200 hover:border-[#3B82F6] hover:bg-blue-50/20 text-slate-400 hover:text-[#3B82F6] transition-all flex items-center justify-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 h-10 mt-auto"
                          >
                            <Plus className="h-3.5 w-3.5" /> Schedule Exam
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden transform scale-100 transition-all duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedSlot?.id || selectedSlot?._id ? 'Modify Scheduled Exam' : 'Schedule Custom Exam'}
                </h3>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">
                  {formatDate(dateVal)} ({dateVal}) • {slotVal}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  ⚠️ {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS-101"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Batch Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BSCS-2023"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Course Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Programming Fundamentals"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Exam Room</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 101"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Invigilator</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Alice Smith"
                    value={invigilator}
                    onChange={(e) => setInvigilator(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Date</label>
                  <select
                    value={dateVal}
                    onChange={(e) => setDateVal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-all"
                  >
                    {DATES.map(d => (
                      <option key={d} value={d}>{d} ({formatDate(d)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Exam Slot</label>
                  <select
                    value={slotVal}
                    onChange={(e) => setSlotVal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-all"
                  >
                    {EXAMSLOTS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Override Reason (Mandatory)</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Provide technical description..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                {(selectedSlot?.id || selectedSlot?._id) ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-rose-500 hover:text-rose-700 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors"
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
                    className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md"
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

// Inline AuditLogTable
function AuditLogTable({ scope }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    try {
      const localLogsStr = localStorage.getItem('batchminder_audit_logs');
      const localLogs = localLogsStr ? JSON.parse(localLogsStr) : [];
      const filtered = localLogs.filter(log => {
        if (scope === 'timetable') {
          return (
            log.action === 'TIMETABLE_OVERRIDE' ||
            log.action === 'TIMETABLE_OVERRIDE_DELETE' ||
            log.action === 'TIMETABLE_GENERATED'
          );
        } else {
          return (
            log.action === 'DATESHEET_OVERRIDE' ||
            log.action === 'DATESHEET_OVERRIDE_DELETE' ||
            log.action === 'DATESHEET_COMPILED'
          );
        }
      });
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLogs(filtered);
    } catch (err) {
      console.error('Failed to read audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [scope]);

  const getActionBadgeStyle = (action) => {
    if (action.endsWith('_DELETE')) return 'bg-rose-50 border-rose-200 text-rose-700';
    if (action.endsWith('_GENERATED') || action.endsWith('_COMPILED')) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    return 'bg-amber-50 border-amber-200 text-amber-700';
  };

  const getActionLabel = (action) => {
    if (action.endsWith('_DELETE')) return 'DELETE';
    if (action.endsWith('_GENERATED')) return 'GENERATE';
    if (action.endsWith('_COMPILED')) return 'COMPILE';
    return 'OVERRIDE';
  };

  return (
    <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 text-[#1B3A6B]">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-display">
              {scope === 'timetable' ? 'Timetable Override Audit Trail' : 'Datesheet Override Audit Trail'}
            </h3>
          </div>
        </div>
      </div>
      {logs.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 font-medium bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2">
          <Clock className="h-7 w-7 text-slate-300" />
          <span>No scheduling overrides recorded yet.</span>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150">
                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider w-36">Timestamp</th>
                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider w-24">Action</th>
                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider w-36">Actor</th>
                <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Log Detail / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-750">
              {logs.map((log, idx) => {
                const date = new Date(log.timestamp);
                return (
                  <tr key={log.id || idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-3 text-slate-450 font-mono tracking-tight whitespace-nowrap">
                      {date.toLocaleDateString() + ' ' + date.toLocaleTimeString()}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-extrabold rounded-md border tracking-wider uppercase font-mono ${getActionBadgeStyle(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{log.actor?.name || 'System'}</div>
                      <div className="text-[10px] text-slate-450 font-mono">{log.actor?.email}</div>
                    </td>
                    <td className="p-3 leading-relaxed">
                      <p>{log.description}</p>
                      {log.metadata?.overrideReason && (
                        <p className="mt-1 text-[11px] text-slate-500 font-semibold italic">
                          Reason: "{log.metadata.overrideReason}"
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScheduleOverride() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("timetable");
  const [entries, setEntries] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, refreshTrigger]);

  const fetchData = (tab) => {
    setLoading(true);
    try {
      const key = tab === "timetable" ? "batchminder_timetable_entries" : "batchminder_datesheet_entries";
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        if (data && data.length > 0) {
          setEntries(data);
          setHasData(true);
          setConflicts(
            tab === "timetable"
              ? detectTimetableConflicts(data)
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

  const handleSlotUpdate = async (updatedSlot, overrideReason) => {
    try {
      const key = activeTab === "timetable" ? "batchminder_timetable_entries" : "batchminder_datesheet_entries";
      const storedStr = localStorage.getItem(key);
      let list = storedStr ? JSON.parse(storedStr) : [];

      const targetId = updatedSlot.id;
      const index = targetId ? list.findIndex(e => e._id === targetId || e.id === targetId) : -1;

      const oldLogsStr = localStorage.getItem("batchminder_audit_logs");
      const logs = oldLogsStr ? JSON.parse(oldLogsStr) : [];

      let logDescription = "";

      if (updatedSlot._delete) {
        if (index > -1) {
          const removed = list[index];
          list.splice(index, 1);
          logDescription = activeTab === "timetable"
            ? `Deleted class timetable slot for ${removed.courseCode} (${removed.batch}) on ${removed.day} at ${removed.timeSlot}`
            : `Deleted exam datesheet slot for ${removed.courseCode} (${removed.batch}) on ${removed.date} at ${removed.examSlot}`;
          logs.push({
            id: `audit-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: activeTab === "timetable" ? "TIMETABLE_OVERRIDE_DELETE" : "DATESHEET_OVERRIDE_DELETE",
            actor: { name: user?.name || "System", email: user?.email || "system@stmu.edu.pk" },
            description: logDescription,
            metadata: { reason: overrideReason, scope: activeTab }
          });
        }
      } else if (index > -1) {
        const original = list[index];
        const updated = { ...original, ...updatedSlot, _id: targetId };
        list[index] = updated;
        logDescription = activeTab === "timetable"
          ? `Updated timetable slot for ${updated.courseCode} (${updated.batch}). Moved from ${original.day} ${original.timeSlot} (${original.room}/${original.instructor}) to ${updated.day} ${updated.timeSlot} (${updated.room}/${updated.instructor}).`
          : `Updated datesheet slot for ${updated.courseCode} (${updated.batch}). Moved from ${original.date} ${original.examSlot} (${original.room}/${original.invigilator}) to ${updated.date} ${updated.examSlot} (${updated.room}/${updated.invigilator}).`;
        logs.push({
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: activeTab === "timetable" ? "TIMETABLE_OVERRIDE" : "DATESHEET_OVERRIDE",
          actor: { name: user?.name || "System", email: user?.email || "system@stmu.edu.pk" },
          description: logDescription,
          metadata: { overrideReason, scope: activeTab }
        });
      } else {
        const newEntry = { ...updatedSlot, _id: `${activeTab.substring(0, 1)}-new-${Date.now()}` };
        list.push(newEntry);
        logDescription = activeTab === "timetable"
          ? `Created manual timetable override slot for ${newEntry.courseCode} (${newEntry.batch}) on ${newEntry.day} at ${newEntry.timeSlot}.`
          : `Created manual datesheet override slot for ${newEntry.courseCode} (${newEntry.batch}) on ${newEntry.date} at ${newEntry.examSlot}.`;
        logs.push({
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: activeTab === "timetable" ? "TIMETABLE_OVERRIDE" : "DATESHEET_OVERRIDE",
          actor: { name: user?.name || "System", email: user?.email || "system@stmu.edu.pk" },
          description: logDescription,
          metadata: { overrideReason, scope: activeTab }
        });
      }

      localStorage.setItem(key, JSON.stringify(list));
      localStorage.setItem("batchminder_audit_logs", JSON.stringify(logs));
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Override failed:", err);
    }
  };

  const conflictIdsSet = new Set(conflicts.flatMap((c) => c.cellIds));
  const isConflicted = (entryId) => conflictIdsSet.has(entryId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Override Command Space</span>
          <h2 className="text-2xl font-extrabold text-[#1B3A6B] font-display mt-0.5">Schedule Manual Overrides</h2>
          <p className="text-slate-500 text-xs mt-1">
            Resolve room/faculty overlaps manually. Every override writes to the system audit trails (FR-5.4).
          </p>
        </div>

        <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm text-xs font-semibold select-none self-start sm:self-center">
          <button
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === "timetable" 
                ? "bg-white text-[#1B3A6B] shadow-sm font-bold" 
                : "text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => setActiveTab("timetable")}
          >
            Class Timetable
          </button>
          <button
            className={`px-4 py-2 rounded-xl transition-all ${
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

      <ScheduleStatusBanner conflicts={conflicts} hasData={hasData} />

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
          <h3 className="font-bold text-slate-800 text-sm">No Live Schedule in Scope</h3>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            Please run the automatic generators in **Timetable Generator** or **Exam Datesheet** first to seed a live schedule before performing overrides.
          </p>
        </div>
      ) : activeTab === "timetable" ? (
        <TimetableGrid
          entries={entries}
          isConflicted={isConflicted}
          editable
          onSlotUpdate={handleSlotUpdate}
        />
      ) : (
        <DatesheetGrid
          entries={entries}
          isConflicted={isConflicted}
          editable
          onSlotUpdate={handleSlotUpdate}
        />
      )}

      {!loading && hasData && (
        <div className="mt-8">
          <AuditLogTable scope={activeTab} />
        </div>
      )}
    </div>
  );
}

export default ScheduleOverride;
