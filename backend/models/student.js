import mongoose from 'mongoose';
import './degreeProgress.js';


const courseEnrollmentSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
  },
  courseTitle: {
    type: String,
    required: true,
  },
  creditHours: {
    type: Number,
    required: true,
  },
  grade: {
    type: String,
    default: 'IP', // IP = In Progress, or A, B+, C, F, etc.
  },
  enrollmentStatus: {
    type: String,
    enum: ['enrolled', 'completed', 'failed'],
    default: 'enrolled',
  },
  status: {
    type: String,
    default: 'enrolled',
  },
  attendance: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
  },
  semester: {
    type: Number,
    required: true,
    default: 1,
  }
});

// Thresholds for cgpaStatus computation
// critical: cgpa < 2.0
// warning:  cgpa <= 2.1 (and >= 2.0)
// good:     cgpa > 2.1
function computeCgpaStatus(cgpa) {
  if (cgpa < 2.0) return 'critical';
  if (cgpa <= 2.1) return 'warning';
  return 'good';
}

const studentSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    required: [true, 'Please provide a student roll number'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide student name'],
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please specify department'],
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: [true, 'Please specify batch'],
  },
  currentSemester: {
    type: Number,
    default: 1,
    min: 1,
    max: 12,
  },
  cgpa: {
    type: Number,
    default: 0.0,
    min: 0.0,
    max: 4.0,
  },
  // Computed server-side from cgpa thresholds — never set directly by frontend
  cgpaStatus: {
    type: String,
    enum: ['good', 'warning', 'critical'],
    default: 'good',
  },
  // Enrollment status — independent of academic performance
  status: {
    type: String,
    default: 'active',
  },
  courses: [courseEnrollmentSchema],
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Auto-compute cgpaStatus before every save
studentSchema.pre('save', function (next) {
  this.cgpaStatus = computeCgpaStatus(this.cgpa);
  next();
});

// Auto-compute cgpaStatus on findOneAndUpdate / updateOne
studentSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && (update.cgpa !== undefined || update.$set?.cgpa !== undefined)) {
    const newCgpa = update.cgpa !== undefined ? update.cgpa : update.$set.cgpa;
    const status = computeCgpaStatus(newCgpa);
    if (update.$set) {
      update.$set.cgpaStatus = status;
    } else {
      update.cgpaStatus = status;
    }
  }
  next();
});

// Recalculate Degree Progress and Backlog list (FR-2.6 & FR-5.3)
async function recalculateDegreeProgress(doc) {
  const completedCredits = (doc.courses || [])
    .filter(c => c.enrollmentStatus === 'completed' || c.status === 'completed')
    .reduce((sum, c) => sum + (c.creditHours || 0), 0);
  const remainingCredits = Math.max(130 - completedCredits, 0);
  const completionPercentage = parseFloat(((completedCredits / 130) * 100).toFixed(2));

  const backlog = [];
  try {
    const curriculum = await mongoose.model('Curriculum').findOne({ batchId: doc.batchId, status: 'active' });
    if (curriculum && curriculum.courses) {
      const completedCodes = (doc.courses || [])
        .filter(c => c.status === 'completed' || c.enrollmentStatus === 'completed' || c.grade !== 'F')
        .map(c => c.courseCode);

      for (const course of curriculum.courses) {
        if (!completedCodes.includes(course.code)) {
          // 1. Core check: is it in a semester <= current student semester?
          if (course.semester <= (doc.currentSemester || 1)) {
            backlog.push(course.code);
            continue;
          }

          // 2. Prerequisite check: is it a prerequisite for any course the student is taking/has taken?
          const isPrereqNeeded = curriculum.courses.some(otherCourse => {
            const hasPrereq = otherCourse.prerequisiteCourseIds.some(prereqId => {
              const prereqCourse = curriculum.courses.id(prereqId);
              return prereqCourse && prereqCourse.code === course.code;
            });
            if (hasPrereq) {
              return (doc.courses || []).some(sc => sc.courseCode === otherCourse.code);
            }
            return false;
          });
          if (isPrereqNeeded) {
            backlog.push(course.code);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error calculating backlog courses:', err);
  }

  await mongoose.model('DegreeProgress').findOneAndUpdate(
    { studentId: doc._id },
    {
      completedCredits,
      remainingCredits,
      completionPercentage,
      backlog
    },
    { upsert: true, new: true }
  );
}

// Helper to evaluate CGPA thresholds and trigger Advisor notifications (FR-3.5)
async function triggerAdvisorNotification(doc) {
  const cgpa = doc.cgpa || 0.0;
  if (doc.status === 'active' && cgpa <= 2.1) {
    const type = cgpa < 2.0 ? 'CGPA_CRITICAL' : 'CGPA_WARNING';
    const message = type === 'CGPA_CRITICAL'
      ? `Academic Alert: Student ${doc.name} (${doc.rollNumber}) CGPA has dropped to Critical level: ${cgpa.toFixed(2)}.`
      : `Academic Warning: Student ${doc.name} (${doc.rollNumber}) CGPA is at Warning level: ${cgpa.toFixed(2)}.`;

    const batch = await mongoose.model('Batch').findById(doc.batchId);
    if (batch && batch.advisorId) {
      // 1. Create In-App Notification
      await mongoose.model('Notification').create({
        recipientId: batch.advisorId,
        targetUserID: batch.advisorId,
        recipientRole: 'advisor',
        type,
        message,
        departmentId: doc.departmentId.toString(),
        batchId: doc.batchId.toString(),
        isRead: false,
        deepLinkUrl: `/advisor/students?search=${encodeURIComponent(doc.rollNumber)}`
      });


    }
  }
}

// Post hooks for DegreeProgress and CGPA Threshold Warning Alerts
studentSchema.post('save', async function (doc) {
  try {
    // 1. Calculate and update Degree Progress
    await recalculateDegreeProgress(doc);

    // 2. Evaluate CGPA thresholds and trigger Advisor notifications
    await triggerAdvisorNotification(doc);
  } catch (err) {
    console.error('Error in student post-save hook:', err);
  }
});

studentSchema.post('findOneAndUpdate', async function (doc) {
  if (doc) {
    try {
      // 1. Calculate and update Degree Progress
      await recalculateDegreeProgress(doc);

      // 2. Evaluate CGPA thresholds and trigger Advisor notifications
      await triggerAdvisorNotification(doc);
    } catch (err) {
      console.error('Error in student post-findOneAndUpdate hook:', err);
    }
  }
});

// Export the compute function for use in controllers
studentSchema.statics.computeCgpaStatus = computeCgpaStatus;

const Student = mongoose.model('Student', studentSchema);
export default Student;
