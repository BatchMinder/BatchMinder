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
    enum: ['admin', 'advisor', 'academic_admin', 'super_admin'],
    default: 'advisor',
  },
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
