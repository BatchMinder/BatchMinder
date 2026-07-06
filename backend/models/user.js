import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['super_admin', 'academic_admin', 'admin', 'advisor'],
    default: 'advisor',
  },
  // ObjectId array — populated for academic_admin (Administrator), single for admin (HOD)
  departmentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  // Legacy string field kept for backward compat with Module 1 SuperAdmin UI
  dept: {
    type: String,
    default: 'All Departments'
  },
  status: {
    type: String,
    enum: ['Active', 'Pending', 'Inactive'],
    default: 'Active'
  },
  phone: {
    type: String,
    trim: true
  },
  employeeId: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  profilePictureUrl: {
    type: String,
    default: null
  },
  profilePictureCloudinaryId: {
    type: String,
    default: null
  },
  assignedBatchIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  }]
});

// Composite unique index for email + role combination
userSchema.index({ email: 1, role: 1 }, { unique: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);
export default User;
