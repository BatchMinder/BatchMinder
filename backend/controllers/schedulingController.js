import Timetable from '../models/timetable.js';
import Datesheet from '../models/datesheet.js';
import Batch from '../models/batch.js';
import Curriculum from '../models/curriculum.js';
import User from '../models/user.js';
import Student from '../models/student.js';
import { logAudit } from '../utils/logger.js';

// GET: get weekly timetable
export const getTimetable = async (req, res, next) => {
  try {
    let query = {};

    // If user is an advisor, strictly limit timetable to their assigned batches
    if (req.user && req.user.role === 'advisor' && req.user.assignedBatchIds?.length > 0) {
      const batches = await Batch.find({ _id: { $in: req.user.assignedBatchIds } });
      const batchCodes = batches.map(b => b.code);
      query = { batch: { $in: batchCodes } };
    }

    const entries = await Timetable.find(query);
    res.status(200).json({
      status: 'success',
      data: { entries }
    });
  } catch (err) {
    next(err);
  }
};

// POST: save weekly timetable
export const saveTimetable = async (req, res, next) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request: entries must be an array.'
      });
    }

    // Clean existing and bulk insert new
    await Timetable.deleteMany({});

    // Map entries to ensure no stray _id from frontend storage (or generate if missing)
    const formatted = entries.map(e => {
      const entry = { ...e };
      // If it contains a frontend mock id string like "t-", delete it to let MongoDB create clean ObjectId
      if (entry._id && (typeof entry._id === 'string' && entry._id.startsWith('t-'))) {
        delete entry._id;
      }
      return entry;
    });

    const saved = await Timetable.insertMany(formatted);

    // Log audit
    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'TIMETABLE_SAVED',
      targetType: 'Timetable',
      targetId: 'all',
      departmentId: req.user.departmentIds?.[0]?.toString() || 'all',
      metadata: { count: saved.length }
    });

    res.status(200).json({
      status: 'success',
      data: { entries: saved }
    });
  } catch (err) {
    next(err);
  }
};

// GET: get datesheet
export const getDatesheet = async (req, res, next) => {
  try {
    const entries = await Datesheet.find({});
    res.status(200).json({
      status: 'success',
      data: { entries }
    });
  } catch (err) {
    next(err);
  }
};

// POST: save datesheet
export const saveDatesheet = async (req, res, next) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request: entries must be an array.'
      });
    }

    // Clean existing and bulk insert new
    await Datesheet.deleteMany({});

    const formatted = entries.map(e => {
      const entry = { ...e };
      if (entry._id && (typeof entry._id === 'string' && entry._id.startsWith('e-'))) {
        delete entry._id;
      }
      return entry;
    });

    const saved = await Datesheet.insertMany(formatted);

    // Log audit
    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'DATESHEET_SAVED',
      targetType: 'Datesheet',
      targetId: 'all',
      departmentId: req.user.departmentIds?.[0]?.toString() || 'all',
      metadata: { count: saved.length }
    });

    res.status(200).json({
      status: 'success',
      data: { entries: saved }
    });
  } catch (err) {
    next(err);
  }
};

// POST: save manual schedule override / mutation
export const saveOverride = async (req, res, next) => {
  try {
    const { type, entries } = req.body;
    if (type !== 'timetable' && type !== 'datesheet') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid schedule override type: must be "timetable" or "datesheet".'
      });
    }
    if (!Array.isArray(entries)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request: entries must be an array.'
      });
    }

    let savedCount = 0;
    if (type === 'timetable') {
      // 1. Fetch batches and calculate sizes dynamically for capacity check
      const batches = await Batch.find({});
      const batchMap = {};
      for (const b of batches) {
        const studentCount = await Student.countDocuments({ batchId: b._id });
        batchMap[b.code] = studentCount > 0 ? studentCount : 35;
      }

      const roomCapacityMap = {
        'Room 101': 50,
        'Room 102': 45,
        'Room 103': 45,
        'Room 104': 50,
        'Room 201': 60,
        'Room 202': 60,
        'Room 203': 55,
        'Room 204': 60,
        'Room 301': 50,
        'Room 302': 50,
        'Lab A': 30,
        'Lab B': 30,
        'Lab C': 30,
        'Lab D': 30,
        'Exam Hall': 150,
        'Main Auditorium': 200
      };

      // 2. Validate all incoming entries against hard constraints (FR-5.4)
      for (let i = 0; i < entries.length; i++) {
        const a = entries[i];

        // Validation 1: Room Capacity Constraint (FR-5.5)
        const batchSize = batchMap[a.batch] || 35;
        const capacity = roomCapacityMap[a.room] || 40;
        if (capacity < batchSize) {
          return res.status(400).json({
            status: 'error',
            message: `Constraint Violation: ${a.room} (Capacity: ${capacity}) is too small for Batch ${a.batch} (Size: ${batchSize}).`
          });
        }

        for (let j = i + 1; j < entries.length; j++) {
          const b = entries[j];
          if (a.day === b.day && a.timeSlot === b.timeSlot) {
            // Validation 2: Room Clash
            if (a.room === b.room) {
              return res.status(400).json({
                status: 'error',
                message: `Constraint Violation: Room Double-Booking in ${a.room} at ${a.day} ${a.timeSlot} (${a.courseCode} & ${b.courseCode}).`
              });
            }
            // Validation 3: Faculty Clash
            if (a.instructor === b.instructor) {
              return res.status(400).json({
                status: 'error',
                message: `Constraint Violation: Instructor Double-Booking for ${a.instructor} at ${a.day} ${a.timeSlot} (${a.courseCode} & ${b.courseCode}).`
              });
            }
            // Validation 4: Student Cohort Overlap - only a real clash within the SAME semester
            // of the batch; different semesters of a batch aren't in class together.
            if (a.batch === b.batch && a.semester === b.semester) {
              return res.status(400).json({
                status: 'error',
                message: `Constraint Violation: Student Cohort Overlap for Batch ${a.batch} (Sem ${a.semester}) at ${a.day} ${a.timeSlot} (${a.courseCode} & ${b.courseCode}).`
              });
            }
          }
        }
      }

      await Timetable.deleteMany({});
      const formatted = entries.map(e => {
        const entry = { ...e };
        if (entry._id && (typeof entry._id === 'string' && entry._id.startsWith('t-'))) {
          delete entry._id;
        }
        return entry;
      });
      const saved = await Timetable.insertMany(formatted);
      savedCount = saved.length;
    } else {
      // Validate datesheet override constraints
      for (let i = 0; i < entries.length; i++) {
        const a = entries[i];
        for (let j = i + 1; j < entries.length; j++) {
          const b = entries[j];

          const aDate = a.date || a.examDate;
          const bDate = b.date || b.examDate;
          const aSlot = a.examSlot || a.timeSlot;
          const bSlot = b.examSlot || b.timeSlot;
          const aRoom = a.room || a.roomNo;
          const bRoom = b.room || b.roomNo;
          const aInv = a.invigilator || a.invigilatorId;
          const bInv = b.invigilator || b.invigilatorId;

          if (aDate && bDate && new Date(aDate).getTime() === new Date(bDate).getTime() && aSlot === bSlot) {
            if (aRoom && bRoom && aRoom === bRoom) {
              return res.status(400).json({
                status: 'error',
                message: `Datesheet Violation: Room Double-Booking in ${aRoom} on ${new Date(aDate).toLocaleDateString()} (${a.courseCode} & ${b.courseCode}).`
              });
            }
            if (aInv && bInv && aInv === bInv) {
              return res.status(400).json({
                status: 'error',
                message: `Datesheet Violation: Invigilator Double-Booking for ${aInv} on ${new Date(aDate).toLocaleDateString()} (${a.courseCode} & ${b.courseCode}).`
              });
            }
            // Only a real clash within the SAME semester of the batch - different semesters
            // of a batch don't sit exams together even if the dates line up.
            if (a.batch === b.batch && a.semester === b.semester) {
              return res.status(400).json({
                status: 'error',
                message: `Datesheet Violation: Cohort Overlap for Batch ${a.batch} (Sem ${a.semester}) on ${new Date(aDate).toLocaleDateString()} (${a.courseCode} & ${b.courseCode}).`
              });
            }
          }
        }
      }

      await Datesheet.deleteMany({});
      const formatted = entries.map(e => {
        const entry = { ...e };
        if (entry._id && (typeof entry._id === 'string' && entry._id.startsWith('e-'))) {
          delete entry._id;
        }
        return entry;
      });
      const saved = await Datesheet.insertMany(formatted);
      savedCount = saved.length;
    }

    // Log audit for elevated override
    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'SCHEDULE_OVERRIDE',
      targetType: type === 'timetable' ? 'Timetable' : 'Datesheet',
      targetId: 'all',
      departmentId: req.user.departmentIds?.[0]?.toString() || 'all',
      metadata: { description: `Elevated manual override saved for ${type}`, count: savedCount }
    });

    res.status(200).json({
      status: 'success',
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} manual override saved successfully.`
    });
  } catch (err) {
    next(err);
  }
};

// POST: check timetable conflicts / clashes
export const checkTimetableClash = async (req, res, next) => {
  try {
    const { day, timeSlot, room, instructor, courseCode } = req.body;

    if (!day || !timeSlot || !room || !instructor) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request parameters: day, timeSlot, room, and instructor are required.'
      });
    }

    // Fetch existing schedules for the given Day and Time Slot
    const existingSchedules = await Timetable.find({ day, timeSlot });

    let clashDetected = false;
    let clashReason = '';

    for (const schedule of existingSchedules) {
      // Room Conflict
      if (schedule.room === room) {
        clashDetected = true;
        clashReason = `Room already booked for ${schedule.courseCode} (${schedule.courseName})`;
        break;
      }

      // Faculty Conflict
      if (schedule.instructor === instructor) {
        clashDetected = true;
        clashReason = `Instructor is already teaching ${schedule.courseCode} (${schedule.courseName})`;
        break;
      }
    }

    if (clashDetected) {
      return res.status(200).json({
        status: 'success',
        data: {
          clashed: true,
          status: 'FAILED',
          reason: clashReason
        }
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        clashed: false,
        status: 'SUCCESS',
        message: 'No clash detected. Slot available.'
      }
    });
  } catch (err) {
    next(err);
  }
};
// POST: Auto-generate timetable (FR-5.1)
export const autoGenerateTimetable = async (req, res, next) => {
  try {
    const { batchId, semester } = req.body;

    if (!batchId || !semester) {
      return res.status(400).json({ status: 'error', message: 'Batch ID and semester are required' });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ status: 'error', message: 'Batch not found' });
    }

    // 1. Fetch active curriculum from DB (tries batchId -> departmentId -> HEC Standard -> any active)
    let curriculum = await Curriculum.findOne({ batchId, status: 'active' });
    if (!curriculum && batch.departmentId) {
      curriculum = await Curriculum.findOne({ departmentId: batch.departmentId, status: 'active' });
    }
    if (!curriculum) {
      curriculum = await Curriculum.findOne({ isHecStandard: true, status: 'active' });
    }
    if (!curriculum) {
      curriculum = await Curriculum.findOne({ status: 'active' });
    }

    if (!curriculum || !curriculum.courses || curriculum.courses.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No active curriculum found for this batch or department' });
    }

    // Filter active curriculum courses for the selected semester
    const semNum = Number(semester);
    const coursesToSchedule = curriculum.courses.filter(c => c.semester === semNum);
    if (!coursesToSchedule || coursesToSchedule.length === 0) {
      return res.status(404).json({ status: 'error', message: `No courses found for semester ${semester} in active curriculum` });
    }

    // Fetch instructors dynamically from DB users
    let instructors = await User.find({ role: { $in: ['advisor', 'faculty', 'admin', 'academic_admin', 'dean'] } }).select('name');
    let instructorNames = instructors.map(i => i.name).filter(Boolean);
    if (instructorNames.length === 0) {
      const allUsers = await User.find({}).select('name');
      instructorNames = allUsers.map(u => u.name).filter(Boolean);
    }

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const TIMESLOTS = [
      '08:00 AM - 09:00 AM',
      '09:00 AM - 10:00 AM',
      '10:00 AM - 11:00 AM',
      '11:00 AM - 12:00 PM',
      '12:00 PM - 01:00 PM'
    ];

    const LECTURE_ROOMS = ['Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 201', 'Room 202', 'Room 203', 'Room 204', 'Room 301', 'Room 302'];
    const LAB_ROOMS = ['Lab A', 'Lab B', 'Lab C', 'Lab D'];

    const roomCapacityMap = {
      'Room 101': 50,
      'Room 102': 45,
      'Room 103': 45,
      'Room 104': 50,
      'Room 201': 60,
      'Room 202': 60,
      'Room 203': 55,
      'Room 204': 60,
      'Room 301': 50,
      'Room 302': 50,
      'Lab A': 30,
      'Lab B': 30,
      'Lab C': 30,
      'Lab D': 30
    };

    // Assign distinct instructors across courses using round-robin distribution
    const courseInstructorMap = {};
    coursesToSchedule.forEach((course, idx) => {
      courseInstructorMap[course.code] = instructorNames[idx % instructorNames.length];
    });

    // Delete previous timetable entries for this batch and semester
    await Timetable.deleteMany({ batch: batch.code, semester: semNum });

    const studentCount = await Student.countDocuments({ batchId });
    const batchSize = studentCount > 0 ? studentCount : 35;

    const existing = await Timetable.find({
      $or: [
        { batch: { $ne: batch.code } },
        { semester: { $ne: semNum } }
      ]
    });
    const generatedEntries = [];

    // Schedule each course for N sessions = creditHours per week
    for (let cIdx = 0; cIdx < coursesToSchedule.length; cIdx++) {
      const course = coursesToSchedule[cIdx];
      const assignedInstructor = courseInstructorMap[course.code];
      const isLabCourse = course.courseType === 'LAB' || (course.title && course.title.toLowerCase().includes('lab'));
      const candidateRooms = isLabCourse
        ? [...LAB_ROOMS, ...LECTURE_ROOMS]
        : [...LECTURE_ROOMS, ...LAB_ROOMS];

      const totalSessionsNeeded = Number(course.creditHours) || 3;

      for (let sessionNum = 0; sessionNum < totalSessionsNeeded; sessionNum++) {
        let assigned = false;

        // Days where this course does not have a session yet
        const daysWithThisCourse = generatedEntries
          .filter(e => e.courseCode === course.code)
          .map(e => e.day);

        // Sort days: days without this course first, then days with lowest total sessions
        const sortedDays = [...DAYS].sort((a, b) => {
          const hasA = daysWithThisCourse.includes(a) ? 1 : 0;
          const hasB = daysWithThisCourse.includes(b) ? 1 : 0;
          if (hasA !== hasB) return hasA - hasB;
          const countA = generatedEntries.filter(e => e.day === a).length;
          const countB = generatedEntries.filter(e => e.day === b).length;
          return countA - countB;
        });

        // Time slot offset per course/session for natural daily distribution
        const slotOffset = (cIdx * 2 + sessionNum) % TIMESLOTS.length;
        const rotatedSlots = [
          ...TIMESLOTS.slice(slotOffset),
          ...TIMESLOTS.slice(0, slotOffset)
        ];

        for (const day of sortedDays) {
          if (assigned) break;

          for (const timeSlot of rotatedSlots) {
            if (assigned) break;

            // Student cohort cannot have 2 classes at the exact same slot
            const semBusySlot = generatedEntries.some(e => e.day === day && e.timeSlot === timeSlot);
            if (semBusySlot) continue;

            for (const room of candidateRooms) {
              if (assigned) break;

              const roomCapacity = roomCapacityMap[room] || 40;
              if (roomCapacity < batchSize) continue;

              const roomTaken = existing.some(e => e.day === day && e.timeSlot === timeSlot && e.room === room) ||
                generatedEntries.some(e => e.day === day && e.timeSlot === timeSlot && e.room === room);
              const instructorTaken = existing.some(e => e.day === day && e.timeSlot === timeSlot && e.instructor === assignedInstructor) ||
                generatedEntries.some(e => e.day === day && e.timeSlot === timeSlot && e.instructor === assignedInstructor);

              if (!roomTaken && !instructorTaken) {
                generatedEntries.push({
                  day,
                  timeSlot,
                  courseCode: course.code,
                  courseName: course.title,
                  creditHours: course.creditHours || 3,
                  room,
                  instructor: assignedInstructor,
                  batch: batch.code,
                  semester: semNum,
                  departmentId: batch.departmentId
                });
                assigned = true;
                break;
              }
            }
          }
        }
      }
    }

    const savedEntries = await Timetable.insertMany(generatedEntries);

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'TIMETABLE_GENERATED',
      targetType: 'Timetable',
      targetId: 'all',
      departmentId: batch.departmentId.toString(),
      metadata: { description: `Auto-generated timetable for batch ${batch.code}, semester ${semester}`, count: savedEntries.length }
    });

    res.status(200).json({
      status: 'success',
      message: 'Automatic Timetable Generation successful.',
      data: { entries: savedEntries }
    });
  } catch (err) {
    next(err);
  }
};

// POST: Auto-generate examination datesheet (FR-5.2)
// Mirrors autoGenerateTimetable's constraint-checked assignment approach so datesheet
// generation has the same backend-driven, persisted, audit-logged architecture as
// timetable generation, instead of living only in the frontend.
export const autoGenerateDatesheet = async (req, res, next) => {
  try {
    const { batchId, semester } = req.body;

    if (!batchId || !semester) {
      return res.status(400).json({ status: 'error', message: 'Batch ID and semester are required' });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ status: 'error', message: 'Batch not found' });
    }

    // 1. Resolve active curriculum the same way autoGenerateTimetable does
    let curriculum = await Curriculum.findOne({ batchId, status: 'active' });
    if (!curriculum && batch.departmentId) {
      curriculum = await Curriculum.findOne({ departmentId: batch.departmentId, status: 'active' });
    }
    if (!curriculum) {
      curriculum = await Curriculum.findOne({ isHecStandard: true, status: 'active' });
    }
    if (!curriculum) {
      curriculum = await Curriculum.findOne({ status: 'active' });
    }

    if (!curriculum || !curriculum.courses || curriculum.courses.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No active curriculum found for this batch or department' });
    }

    const semNum = Number(semester);
    const coursesToSchedule = curriculum.courses.filter(c => c.semester === semNum);
    if (!coursesToSchedule || coursesToSchedule.length === 0) {
      return res.status(404).json({ status: 'error', message: `No courses found for semester ${semester} in active curriculum` });
    }

    // 2. Invigilator pool (faculty/advisor/admin users, same fallback pattern as timetable instructors)
    let invigilatorPool = await User.find({ role: { $in: ['advisor', 'faculty', 'admin', 'academic_admin', 'dean'] } }).select('name');
    let invigilatorNames = invigilatorPool.map(u => u.name).filter(Boolean);
    if (invigilatorNames.length === 0) {
      const allUsers = await User.find({}).select('name');
      invigilatorNames = allUsers.map(u => u.name).filter(Boolean);
    }
    if (invigilatorNames.length === 0) {
      invigilatorNames = ['Invigilator A', 'Invigilator B', 'Invigilator C'];
    }

    const EXAM_SLOTS = ['09:00 AM - 12:00 PM', '02:00 PM - 05:00 PM'];
    const ROOMS = [
      'Room 101', 'Room 102', 'Room 103', 'Room 104',
      'Room 201', 'Room 202', 'Room 203', 'Room 204',
      'Room 301', 'Room 302',
      'Lab A', 'Lab B', 'Lab C', 'Lab D',
      'Exam Hall', 'Main Auditorium'
    ];
    const roomCapacityMap = {
      'Room 101': 50,
      'Room 102': 45,
      'Room 103': 45,
      'Room 104': 50,
      'Room 201': 60,
      'Room 202': 60,
      'Room 203': 55,
      'Room 204': 60,
      'Room 301': 50,
      'Room 302': 50,
      'Lab A': 30,
      'Lab B': 30,
      'Lab C': 30,
      'Lab D': 30,
      'Exam Hall': 150,
      'Main Auditorium': 200
    };

    // 3. Build a rolling list of upcoming weekdays (Mon-Fri) to serve as exam dates,
    // so generation always produces a forward-looking datesheet regardless of when it's run.
    const examDates = [];
    const cursor = new Date();
    cursor.setDate(cursor.getDate() + 1);
    while (examDates.length < 10) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        examDates.push(cursor.toISOString().slice(0, 10));
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const studentCount = await Student.countDocuments({ batchId });
    const batchSize = studentCount > 0 ? studentCount : 35;

    // Existing entries for OTHER batches/semesters -- used to avoid room/invigilator clashes
    // against exams already scheduled elsewhere (multi-dimensional conflict detection, FE-17/FR-5.2/5.3).
    const existing = await Datesheet.find({
      $or: [
        { batch: { $ne: batch.code } },
        { semester: { $ne: semNum } }
      ]
    });

    await Datesheet.deleteMany({ batch: batch.code, semester: semNum });

    const generatedEntries = [];
    const unscheduledCourses = [];

    for (let cIdx = 0; cIdx < coursesToSchedule.length; cIdx++) {
      const course = coursesToSchedule[cIdx];
      let assigned = false;

      for (const date of examDates) {
        if (assigned) break;

        // Hard constraint: this cohort cannot sit two exams on the same date (cohort overlap).
        // Only checked against entries being generated in THIS run (same batch + same semester).
        // `existing` includes past/other-semester entries for this same batch too, which must
        // NOT block new dates here - otherwise every semester generated after the first ends up
        // with zero available dates (since the rolling date window is the same each time).
        const cohortBusyThisDate = generatedEntries.some(e => e.batch === batch.code && e.date === date);
        if (cohortBusyThisDate) continue;

        for (const examSlot of EXAM_SLOTS) {
          if (assigned) break;

          for (const room of ROOMS) {
            if (assigned) break;

            const capacity = roomCapacityMap[room] || 40;
            if (capacity < batchSize) continue;

            const roomTaken = existing.some(e => e.date === date && e.examSlot === examSlot && e.room === room)
              || generatedEntries.some(e => e.date === date && e.examSlot === examSlot && e.room === room);
            if (roomTaken) continue;

            // Search the invigilator pool for someone actually free at this date+slot, instead of
            // locking in a single fixed invigilator by course index - otherwise the same few
            // invigilators (whoever lands on the low indices) get reused as the "first pick" across
            // every semester ever generated, get booked solid, and then block scheduling entirely
            // even when other invigilators in the pool are completely free.
            const startIdx = cIdx % invigilatorNames.length;
            let invigilator = null;
            for (let k = 0; k < invigilatorNames.length; k++) {
              const candidate = invigilatorNames[(startIdx + k) % invigilatorNames.length];
              const candidateTaken = existing.some(e => e.date === date && e.examSlot === examSlot && e.invigilator === candidate)
                || generatedEntries.some(e => e.date === date && e.examSlot === examSlot && e.invigilator === candidate);
              if (!candidateTaken) {
                invigilator = candidate;
                break;
              }
            }
            if (!invigilator) continue;

            generatedEntries.push({
              date,
              examSlot,
              courseCode: course.code,
              courseName: course.title,
              room,
              invigilator,
              batch: batch.code,
              semester: semNum,
              departmentId: batch.departmentId
            });
            assigned = true;
          }
        }
      }

      if (!assigned) {
        unscheduledCourses.push(`${course.code} - ${course.title}`);
      }
    }

    const savedEntries = await Datesheet.insertMany(generatedEntries);

    await logAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'DATESHEET_GENERATED',
      targetType: 'Datesheet',
      targetId: 'all',
      departmentId: batch.departmentId.toString(),
      metadata: {
        description: `Auto-generated examination datesheet for batch ${batch.code}, semester ${semester}`,
        count: savedEntries.length,
        unscheduledCount: unscheduledCourses.length
      }
    });

    // Surface partial-failure clearly instead of reporting "success" when some courses
    // couldn't find any free date/slot/room/invigilator combination in the exam window.
    // (This happens once the shared pool of dates x slots x rooms gets used up by other
    // batches/semesters generated in the same window - add more rooms/invigilators or
    // widen the exam date window if this keeps happening.)
    if (unscheduledCourses.length > 0) {
      return res.status(207).json({
        status: 'partial',
        message: `Datesheet generated with ${unscheduledCourses.length} of ${coursesToSchedule.length} course(s) unscheduled - no available date/slot/room/invigilator combination was found for them within the exam window. Consider freeing up existing datesheets, adding rooms/invigilators, or widening the exam date window.`,
        data: { entries: savedEntries, unscheduledCourses }
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Automatic Datesheet Generation successful.',
      data: { entries: savedEntries }
    });
  } catch (err) {
    next(err);
  }
};

// POST: Validate Room Capacity (FR-5.5)
export const validateRoomCapacity = async (req, res, next) => {
  try {
    const { room, studentCount } = req.body;
    // Simulated room database capacity lookup
    const roomCapacityMap = {
      'Room 101': 50,
      'Room 102': 45,
      'Room 103': 45,
      'Room 104': 50,
      'Room 201': 60,
      'Room 202': 60,
      'Room 203': 55,
      'Room 204': 60,
      'Room 301': 50,
      'Room 302': 50,
      'Lab A': 30,
      'Lab B': 30,
      'Lab C': 30,
      'Lab D': 30,
      'Exam Hall': 150,
      'Main Auditorium': 200
    };

    const capacity = roomCapacityMap[room] || 40; // fallback capacity

    if (studentCount > capacity) {
      return res.status(200).json({
        status: 'success',
        data: {
          isValid: false,
          capacity,
          message: `Capacity Exceeded! ${room} can only hold ${capacity} students. (Attempted: ${studentCount})`
        }
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        isValid: true,
        capacity,
        message: 'Room capacity is sufficient.'
      }
    });
  } catch (err) {
    next(err);
  }
};