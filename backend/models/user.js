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
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['dean', 'academic_admin', 'admin', 'advisor'],
    default: 'advisor',
  },
  // ObjectId array — populated for academic_admin (Administrator), single for admin (HOD)
  departmentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  // Legacy string field kept for backward compat with Module 1 Dean UI
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
  lastLogin: {
    type: Date,
    default: null
  },
  // Updated on every authenticated request; used to enforce inactivity-based
  // session timeout (FR-1.4), independent of the refresh token's absolute 7-day expiry.
  lastActivityAt: {
    type: Date,
    default: Date.now
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
  }],
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  }
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