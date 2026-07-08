import mongoose from 'mongoose';

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
    enum: ['active', 'inactive'],
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

// Export the compute function for use in controllers
studentSchema.statics.computeCgpaStatus = computeCgpaStatus;

const Student = mongoose.model('Student', studentSchema);
export default Student;
