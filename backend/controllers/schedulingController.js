import Timetable from '../models/timetable.js';
import Datesheet from '../models/datesheet.js';
import Batch from '../models/batch.js';
import Curriculum from '../models/curriculum.js';
import User from '../models/user.js';
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

    const curriculum = await Curriculum.findOne({ batchId, status: 'active' });
    if (!curriculum || !curriculum.courses || curriculum.courses.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No active curriculum found for this batch' });
    }

    const coursesToSchedule = curriculum.courses.filter(c => c.semester === Number(semester));
    if (coursesToSchedule.length === 0) {
      return res.status(404).json({ status: 'error', message: `No courses found for semester ${semester} in curriculum` });
    }

    let instructors = await User.find({ role: { $in: ['advisor', 'faculty', 'admin'] } }).select('name');
    let instructorNames = instructors.map(i => i.name);
    if (instructorNames.length === 0) {
      instructorNames = ['Dr. Alice Smith', 'Dr. Bob Johnson', 'Prof. Carol Williams', 'Dr. David Brown'];
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

    // Delete existing timetable for this batch and semester
    await Timetable.deleteMany({ batch: batch.code, semester: Number(semester) });

    const existing = await Timetable.find({});
    const generatedEntries = [];

    const allSlots = [];
    for (const d of DAYS) {
      for (const t of TIMESLOTS) {
        allSlots.push({ day: d, timeSlot: t });
      }
    }

    for (const course of coursesToSchedule) {
      let assigned = false;
      for (const slot of allSlots) {
        if (assigned) break;
        for (const room of ROOMS) {
          if (assigned) break;
          for (const instructor of instructorNames) {
            const roomTaken = existing.some(e => e.day === slot.day && e.timeSlot === slot.timeSlot && e.room === room);
            const instructorTaken = existing.some(e => e.day === slot.day && e.timeSlot === slot.timeSlot && e.instructor === instructor);
            const batchBusyDb = existing.some(e => e.day === slot.day && e.timeSlot === slot.timeSlot && e.batch === batch.code);
            const batchBusy = generatedEntries.some(e => e.day === slot.day && e.timeSlot === slot.timeSlot);

            if (!roomTaken && !instructorTaken && !batchBusyDb && !batchBusy) {
              generatedEntries.push({
                day: slot.day,
                timeSlot: slot.timeSlot,
                courseCode: course.code,
                courseName: course.title,
                room,
                instructor,
                batch: batch.code,
                semester: Number(semester),
                departmentId: batch.departmentId
              });
              assigned = true;
              break;
            }
          }
        }
      }
      if (!assigned) {
        generatedEntries.push({
          day: DAYS[0], timeSlot: TIMESLOTS[0],
          courseCode: course.code, courseName: course.title,
          room: ROOMS[0], instructor: instructorNames[0],
          batch: batch.code, semester: Number(semester), departmentId: batch.departmentId
        });
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

// POST: Validate Room Capacity (FR-5.5)
export const validateRoomCapacity = async (req, res, next) => {
  try {
    const { room, studentCount } = req.body;
    // Simulated room database capacity lookup
    const roomCapacityMap = {
      'Room 101': 50,
      'Room 102': 45,
      'Lab A': 30,
      'Lab B': 30,
      'Room 201': 60,
      'Room 202': 60
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
