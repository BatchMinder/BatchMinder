import User from '../models/user.js';
import { logAudit } from '../utils/logger.js';

// Helpers to map roles
const toDbRole = (feRole) => {
  const map = {
    'Batch Advisor': 'advisor',
    'HOD': 'admin',
    'Administrator': 'academic_admin',
    'Super Admin': 'super_admin'
  };
  return map[feRole] || 'advisor';
};

const toFeRole = (dbRole) => {
  const map = {
    'advisor': 'Batch Advisor',
    'admin': 'HOD',
    'academic_admin': 'Administrator',
    'super_admin': 'Super Admin'
  };
  return map[dbRole] || 'Batch Advisor';
};

const toFeUser = (user) => {
  if (!user) return null;
  // initials
  const nameParts = user.name.split(' ');
  const initials = nameParts.map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'US';
  
  // colors mapping based on role
  const colors = {
    'super_admin': '#E11D48',
    'academic_admin': '#10B981',
    'admin': '#7C3AED',
    'advisor': '#2563EB'
  };
  const color = colors[user.role] || '#64748B';

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: toFeRole(user.role),
    dept: user.dept || 'All Departments',
    status: user.status || 'Active',
    phone: user.phone || '',
    employeeId: user.employeeId || '',
    password: '••••••••',
    initials,
    color,
    createdAt: user.createdAt
  };
};

// GET: list all users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    const mapped = users.map(toFeUser);
    res.status(200).json({
      status: 'success',
      results: mapped.length,
      data: mapped
    });
  } catch (err) {
    next(err);
  }
};

// POST: create a user
export const createUser = async (req, res, next) => {
  try {
    const { name, email, role, dept, status, phone, employeeId, password } = req.body;
    
    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'A user with this email already exists'
      });
    }

    // Set default password if none provided
    const defaultPassword = password || 'STMU12345';

    const dbRole = toDbRole(role);

    const newUser = await User.create({
      name,
      email,
      password: defaultPassword,
      role: dbRole,
      dept: dept || 'All Departments',
      status: status || 'Active',
      phone,
      employeeId
    });

    // Log to Audit Log
    await logAudit({
      actorId: req.user ? req.user._id : null,
      actorRole: req.user ? req.user.role : null,
      action: 'USER_CREATE',
      targetType: 'User',
      targetId: newUser._id.toString(),
      departmentId: newUser.dept || ''
    });

    res.status(201).json({
      status: 'success',
      data: toFeUser(newUser)
    });
  } catch (err) {
    next(err);
  }
};

// PATCH: update user details
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, dept, status, phone, employeeId, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = toDbRole(role);
    if (dept) user.dept = dept;
    if (status) user.status = status;
    if (phone !== undefined) user.phone = phone;
    if (employeeId !== undefined) user.employeeId = employeeId;
    if (password && password !== '••••••••' && password.trim() !== '') {
      user.password = password;
    }

    await user.save();

    // Log to Audit Log
    await logAudit({
      actorId: req.user ? req.user._id : null,
      actorRole: req.user ? req.user.role : null,
      action: 'USER_UPDATE',
      targetType: 'User',
      targetId: user._id.toString(),
      departmentId: user.dept || ''
    });

    res.status(200).json({
      status: 'success',
      data: toFeUser(user)
    });
  } catch (err) {
    next(err);
  }
};

// DELETE: delete a user
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Log to Audit Log
    await logAudit({
      actorId: req.user ? req.user._id : null,
      actorRole: req.user ? req.user.role : null,
      action: 'USER_DELETE',
      targetType: 'User',
      targetId: user._id.toString(),
      departmentId: user.dept || ''
    });

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
