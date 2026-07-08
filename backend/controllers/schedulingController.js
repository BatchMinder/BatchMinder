import Timetable from '../models/timetable.js';
import Datesheet from '../models/datesheet.js';
import { logAudit } from '../utils/logger.js';

// GET: get weekly timetable
export const getTimetable = async (req, res, next) => {
  try {
    const entries = await Timetable.find({});
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
