import Student from '../models/student.js';
import Curriculum from '../models/curriculum.js';
import AuditLog from '../models/auditLog.js';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { uploadToCloudinary } from '../utils/cloudinary.js';

// Helper to log audit actions
const logAudit = async (userId, userEmail, action, description) => {
  try {
    await AuditLog.create({
      userId,
      userEmail,
      action,
      description,
    });
  } catch (err) {
    console.error('Audit logging failed inside studentController:', err);
  }
};

// GET /api/students - Get all students with query filters, search, and pagination
export const getAllStudents = async (req, res) => {
  try {
    const { batch, status, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (batch) filter.batch = batch;
    if (status) filter.status = status;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skipIndex = (Number(page) - 1) * Number(limit);
    const students = await Student.find(filter)
      .sort({ rollNumber: 1 })
      .skip(skipIndex)
      .limit(Number(limit));

    const totalStudents = await Student.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: students.length,
      total: totalStudents,
      currentPage: Number(page),
      totalPages: Math.ceil(totalStudents / Number(limit)),
      data: {
        students,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/students/:id - Get student profile by database ID or Roll Number
export const getStudentById = async (req, res) => {
  try {
    const identifier = req.params.id;
    // Query by database ObjectId or string Roll Number
    const query = identifier.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: identifier } 
      : { rollNumber: identifier.toUpperCase().trim() };

    const student = await Student.findOne(query);

    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        student,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/students - Add a single student manually
export const createStudent = async (req, res) => {
  try {
    const { rollNumber, name, email, batch, department, currentSemester, cgpa, status, courses } = req.body;

    if (!rollNumber || !name || !batch || !department) {
      return res.status(400).json({ message: 'Please provide rollNumber, name, batch, and department' });
    }

    const existingStudent = await Student.findOne({ rollNumber: rollNumber.toUpperCase().trim() });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student with this roll number already exists' });
    }

    const student = await Student.create({
      rollNumber: rollNumber.toUpperCase().trim(),
      name,
      email,
      batch,
      department,
      currentSemester: currentSemester || 1,
      cgpa: cgpa || 0.0,
      status: status || 'good_standing',
      courses: courses || [],
    });

    // Log the manual enrollment action
    const actorEmail = req.user ? req.user.email : 'system@batchminder.local';
    const actorId = req.user ? req.user._id : null;
    await logAudit(
      actorId,
      actorEmail,
      'STUDENT_CREATED',
      `Manually enrolled student: ${student.name} (Roll: ${student.rollNumber}) in department: ${student.department}`
    );

    res.status(201).json({
      status: 'success',
      data: {
        student,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/students/:id - Update student record details
export const updateStudent = async (req, res) => {
  try {
    const identifier = req.params.id;
    const query = identifier.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: identifier } 
      : { rollNumber: identifier.toUpperCase().trim() };

    const student = await Student.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true
    });

    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    // Log edit
    const actorEmail = req.user ? req.user.email : 'system@batchminder.local';
    const actorId = req.user ? req.user._id : null;
    await logAudit(
      actorId,
      actorEmail,
      'STUDENT_UPDATED',
      `Updated student profile for roll number: ${student.rollNumber}`
    );

    res.status(200).json({
      status: 'success',
      data: {
        student,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/students/:id - Remove student record
export const deleteStudent = async (req, res) => {
  try {
    const identifier = req.params.id;
    const query = identifier.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: identifier } 
      : { rollNumber: identifier.toUpperCase().trim() };

    const student = await Student.findOneAndDelete(query);

    if (!student) {
      return res.status(404).json({ message: 'Student record not found' });
    }

    // Log action
    const actorEmail = req.user ? req.user.email : 'system@batchminder.local';
    const actorId = req.user ? req.user._id : null;
    await logAudit(
      actorId,
      actorEmail,
      'STUDENT_DELETED',
      `Deleted student: ${student.name} (Roll: ${student.rollNumber})`
    );

    res.status(200).json({
      status: 'success',
      message: 'Student record deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/students/upload - Stream & parse CSV records using csv-parser
export const bulkUploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV file' });
    }

    const rows = [];
    const stream = Readable.from(req.file.buffer.toString());

    // Stream lines through csv-parser
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => rows.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      return res.status(400).json({ message: 'CSV file is empty' });
    }

    // Prepare bulk ops array (using upsert logic based on rollNumber)
    const bulkOps = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rollNumber = row.rollNumber || row.RollNumber;
      const name = row.name || row.Name;
      const email = row.email || row.Email;
      const batch = row.batch || row.Batch;
      const department = row.department || row.Department;
      const cgpa = Number(row.cgpa || row.CGPA || 0);
      const status = row.status || row.Status || 'good_standing';

      if (!rollNumber || !name || !batch || !department) {
        errors.push(`Row ${i + 1}: Missing required fields (rollNumber, name, batch, department)`);
        continue;
      }

      bulkOps.push({
        updateOne: {
          filter: { rollNumber: rollNumber.toUpperCase().trim() },
          update: {
            $set: {
              rollNumber: rollNumber.toUpperCase().trim(),
              name: name.trim(),
              email: email ? email.toLowerCase().trim() : '',
              batch: batch.toString().trim(),
              department: department.trim(),
              cgpa: isNaN(cgpa) ? 0.0 : cgpa,
              status: ['good_standing', 'warning', 'critical'].includes(status) ? status : 'good_standing',
            }
          },
          upsert: true
        }
      });
    }

    if (bulkOps.length === 0) {
      return res.status(400).json({ message: 'No valid rows found to process', errors });
    }

    const result = await Student.bulkWrite(bulkOps);

    // Upload the CSV file buffer to Cloudinary for archive storage
    let archiveUrl = null;
    try {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'csv_archives');
      archiveUrl = uploadResult.secure_url;
    } catch (err) {
      console.error('Failed to archive CSV to Cloudinary:', err);
    }

    // Audit log
    const actorEmail = req.user ? req.user.email : 'system@batchminder.local';
    const actorId = req.user ? req.user._id : null;
    await logAudit(
      actorId,
      actorEmail,
      'STUDENT_BULK_UPLOADED',
      `Bulk imported student records. Upserted count: ${bulkOps.length}. Modified: ${result.nModified || 0}. Inserted/Upserted: ${result.nUpserted || 0}. Archive: ${archiveUrl || 'Failed to upload'}`
    );

    res.status(200).json({
      status: 'success',
      data: {
        processed: bulkOps.length,
        upserted: result.nUpserted,
        modified: result.nModified,
        errors: errors.length > 0 ? errors : undefined,
        archiveUrl: archiveUrl || undefined,
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/students/sync-lms - Mock fetch synchronization from ERP/LMS endpoint
export const syncLmsRecords = async (req, res) => {
  try {
    const { batch, department } = req.body;
    
    if (!batch || !department) {
      return res.status(400).json({ message: 'Please specify batch and department to synchronize' });
    }

    // Retrieve active student records
    const students = await Student.find({ batch, department });
    
    if (students.length === 0) {
      return res.status(404).json({ message: 'No students found matching this batch and department' });
    }

    // Simulate mock data integration updates: loop and update random attendance/grades
    const updatedCount = students.length;
    
    for (let student of students) {
      // If student is enrolled in courses, update attendance rates randomly between 65-100%
      if (student.courses && student.courses.length > 0) {
        student.courses.forEach(c => {
          c.attendance = Math.floor(Math.random() * 35) + 65;
          // Set grade mock updates
          if (c.grade === 'IP') {
            const mockGrades = ['A', 'B+', 'B-', 'C', 'F'];
            c.grade = mockGrades[Math.floor(Math.random() * mockGrades.length)];
            c.status = c.grade === 'F' ? 'failed' : 'completed';
          }
        });
      }
      
      // Compute mock GPA adjustments based on grade mappings
      let totalGradePoints = 0;
      let totalCredits = 0;
      const gpaValues = { 'A': 4.0, 'B+': 3.5, 'B-': 2.7, 'C': 2.0, 'F': 0.0, 'IP': 0.0 };
      
      student.courses.forEach(c => {
        if (c.status !== 'enrolled') {
          totalGradePoints += (gpaValues[c.grade] || 0.0) * c.creditHours;
          totalCredits += c.creditHours;
        }
      });
      
      if (totalCredits > 0) {
        student.cgpa = Math.round((totalGradePoints / totalCredits) * 100) / 100;
        student.status = student.cgpa < 2.0 ? 'critical' : student.cgpa < 2.5 ? 'warning' : 'good_standing';
      }

      await student.save();
    }

    // Log the sync execution
    const actorEmail = req.user ? req.user.email : 'system@batchminder.local';
    const actorId = req.user ? req.user._id : null;
    await logAudit(
      actorId,
      actorEmail,
      'LMS_SYNCED',
      `Synchronized academic records from LMS feed for ${department} (Batch: ${batch}). Updated ${updatedCount} profiles.`
    );

    res.status(200).json({
      status: 'success',
      message: 'Successfully synchronized student records from LMS mock server',
      syncedCount: updatedCount,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/students/promote-batch - Promote batch semester and load next-level curriculum
export const promoteSemester = async (req, res) => {
  try {
    const { batch, department } = req.body;

    if (!batch || !department) {
      return res.status(400).json({ message: 'Please provide batch and department parameters' });
    }

    const students = await Student.find({ batch, department });
    if (students.length === 0) {
      return res.status(404).json({ message: 'No student profiles matching batch and department' });
    }

    let successfulPromotions = 0;

    for (let student of students) {
      const nextSemester = student.currentSemester + 1;
      
      // 1. Move currently enrolled courses into completed/failed states
      if (student.courses && student.courses.length > 0) {
        student.courses.forEach(c => {
          if (c.status === 'enrolled') {
            c.status = 'completed';
            if (c.grade === 'IP') c.grade = 'B+'; // Auto-grading for audit purposes
          }
        });
      }

      // 2. Query the curriculum course mapping defined for the upcoming semester level
      const nextCurriculum = await Curriculum.findOne({ 
        department, 
        batch, 
        semester: nextSemester 
      });

      // 3. Set the new semester level
      student.currentSemester = nextSemester;

      // 4. Enroll student into new courses if curriculum mappings exist
      if (nextCurriculum && nextCurriculum.courses && nextCurriculum.courses.length > 0) {
        const nextEnrollments = nextCurriculum.courses.map(course => ({
          courseCode: course.courseCode,
          courseTitle: course.title,
          creditHours: course.creditHours,
          grade: 'IP',
          status: 'enrolled',
          attendance: 100
        }));
        student.courses.push(...nextEnrollments);
      }

      await student.save();
      successfulPromotions++;
    }

    // Log the migration action
    const actorEmail = req.user ? req.user.email : 'system@batchminder.local';
    const actorId = req.user ? req.user._id : null;
    await logAudit(
      actorId,
      actorEmail,
      'BATCH_MIGRATED',
      `Promoted batch: ${batch} (Department: ${department}) to semester level. Successful migrations: ${successfulPromotions}`
    );

    res.status(200).json({
      status: 'success',
      message: `Successfully promoted batch ${batch} to next semester`,
      promotedCount: successfulPromotions,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/students/template - Download bulk CSV import template
export const getStudentTemplate = (req, res) => {
  try {
    const csvContent = 'rollNumber,name,email,batch,department,cgpa,status\nF22-BCS-001,Ayesha Khan,ayesha.khan@university.edu,2022,Computer Science,3.82,good_standing\nF22-BCS-014,Ali Raza,ali.raza@university.edu,2022,Computer Science,2.05,warning\nF22-BCS-032,Bilal Siddiqui,bilal.siddiqui@university.edu,2022,Computer Science,1.88,critical\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.csv');
    return res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
