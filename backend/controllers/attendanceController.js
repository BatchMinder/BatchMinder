import Student from '../models/student.js';
import Batch from '../models/batch.js';
import mongoose from 'mongoose';

// GET: Fetch attendance roster for a specific batch and course
export const getAttendanceRoster = async (req, res, next) => {
  try {
    const { batchId, courseCode } = req.query;

    if (!batchId || !courseCode) {
      return res.status(400).json({ status: 'error', message: 'batchId and courseCode are required.' });
    }

    // Find students in the batch who are enrolled in the course
    const students = await Student.find({
      batchId,
      'courses.courseCode': new RegExp(`^${courseCode}$`, 'i'),
      'courses.enrollmentStatus': 'enrolled'
    }).select('name rollNumber courses').lean();

    // Map the response to easily display the specific course attendance
    const roster = students.map(student => {
      const course = student.courses.find(c => c.courseCode.toLowerCase() === courseCode.toLowerCase());
      return {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        attendance: course ? course.attendance : 100
      };
    });

    res.status(200).json({ status: 'success', data: { roster } });
  } catch (err) {
    next(err);
  }
};

// GET: Fetch distinct courses for a specific batch
export const getBatchCourses = async (req, res, next) => {
  try {
    const { batchId } = req.query;
    if (!batchId) {
      return res.status(400).json({ status: 'error', message: 'batchId is required.' });
    }

    // Use aggregation to find distinct courses for students in this batch
    const courses = await Student.aggregate([
      { $match: { batchId: new mongoose.Types.ObjectId(batchId) } },
      { $unwind: "$courses" },
      { $group: { _id: "$courses.courseCode", title: { $first: "$courses.courseTitle" } } },
      { $project: { _id: 0, code: "$_id", title: 1 } },
      { $sort: { code: 1 } }
    ]);

    res.status(200).json({ status: 'success', data: { courses } });
  } catch (err) {
    next(err);
  }
};

// PUT: Bulk update attendance
export const updateAttendance = async (req, res, next) => {
  try {
    const { courseCode, updates } = req.body; // updates: [{ studentId, attendance }]

    if (!courseCode || !Array.isArray(updates)) {
      return res.status(400).json({ status: 'error', message: 'courseCode and updates array are required.' });
    }

    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { 
          _id: update.studentId, 
          'courses.courseCode': new RegExp(`^${courseCode}$`, 'i')
        },
        update: { 
          $set: { 'courses.$.attendance': Number(update.attendance) } 
        }
      }
    }));

    if (bulkOps.length > 0) {
      await Student.bulkWrite(bulkOps);
    }

    res.status(200).json({ status: 'success', message: 'Attendance updated successfully.' });
  } catch (err) {
    next(err);
  }
};

// GET: Attendance report for low attendance (e.g. < 75%)
export const getLowAttendanceReport = async (req, res, next) => {
  try {
    let batchFilter = {};
    if (req.user && req.user.role === 'advisor' && req.user.assignedBatchIds?.length > 0) {
      batchFilter = { batchId: { $in: req.user.assignedBatchIds } };
    }

    const students = await Student.find(batchFilter).populate('batchId', 'code').lean();
    
    const lowAttendanceList = [];
    for (const student of students) {
      if (!student.courses) continue;
      for (const course of student.courses) {
        if (course.enrollmentStatus === 'enrolled' && course.attendance < 75) {
          lowAttendanceList.push({
            studentId: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
            batch: student.batchId ? student.batchId.code : student.batch,
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            attendance: course.attendance
          });
        }
      }
    }

    res.status(200).json({ status: 'success', data: { report: lowAttendanceList } });
  } catch (err) {
    next(err);
  }
};
