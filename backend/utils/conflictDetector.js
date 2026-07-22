/**
 * Detects hard constraint violations for a proposed schedule slot.
 * Works for both Timetable (classes) and Datesheet (exams) scheduling.
 *
 * @param {Object} proposedSlot - The proposed slot details.
 * @param {Array} existingEntries - Array of existing/already scheduled entries.
 * @param {String} mode - 'timetable' or 'datesheet'
 * @returns {Array} - Array of conflict message strings. Empty if no conflicts.
 */
export const detectConflicts = (proposedSlot, existingEntries, mode = 'timetable') => {
  const conflicts = [];
  
  const pDay = mode === 'timetable' ? proposedSlot.day : proposedSlot.date;
  const pTime = mode === 'timetable' ? proposedSlot.timeSlot : proposedSlot.examSlot;
  const pRoom = proposedSlot.room;
  const pInstructor = mode === 'timetable' ? proposedSlot.instructor : proposedSlot.invigilator;
  const pBatch = proposedSlot.batch;

  // Filter existing entries to only those in the same time block
  const concurrentEntries = existingEntries.filter(e => {
    const eDay = mode === 'timetable' ? e.day : e.date;
    const eTime = mode === 'timetable' ? e.timeSlot : e.examSlot;
    // Don't conflict with itself if we are editing an existing slot
    if (proposedSlot._id && e._id && proposedSlot._id.toString() === e._id.toString()) {
      return false;
    }
    return eDay === pDay && eTime === pTime;
  });

  // 1. Room Double-Booking Check
  if (pRoom) {
    const roomClash = concurrentEntries.find(e => e.room === pRoom);
    if (roomClash) {
      conflicts.push(`Room ${pRoom} is already booked for ${roomClash.courseCode || 'another session'}.`);
    }
  }

  // 2. Instructor / Invigilator Double-Booking Check
  if (pInstructor) {
    const instructorClash = concurrentEntries.find(e => {
      const eInst = mode === 'timetable' ? e.instructor : e.invigilator;
      return eInst === pInstructor;
    });
    if (instructorClash) {
      const role = mode === 'timetable' ? 'Instructor' : 'Invigilator';
      conflicts.push(`${role} ${pInstructor} is already assigned to ${instructorClash.courseCode || 'another session'} at this time.`);
    }
  }

  // 3. Batch Double-Booking Check
  if (pBatch) {
    const batchClash = concurrentEntries.find(e => e.batch === pBatch);
    if (batchClash) {
      conflicts.push(`Batch ${pBatch} already has a scheduled session (${batchClash.courseCode || 'unknown'}) at this time.`);
    }
  }

  return conflicts;
};
