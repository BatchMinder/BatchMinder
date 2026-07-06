import User from '../models/user.js';
import { logAudit } from '../utils/logger.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

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
    profilePictureUrl: user.profilePictureUrl || null,
    profilePictureCloudinaryId: user.profilePictureCloudinaryId || null,
    createdAt: user.createdAt
  };
};

const toLoggedInUserFe = (user) => {
  if (!user) return null;
  const nameParts = user.name.split(' ');
  const initials = nameParts.map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'US';
  
  const colors = {
    'super_admin': '#E11D48',
    'academic_admin': '#10B981',
    'admin': '#7C3AED',
    'advisor': '#2563EB'
  };
  const color = colors[user.role] || '#64748B';

  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role, // database role representation (e.g. academic_admin)
    dept: user.dept || 'All Departments',
    status: user.status || 'Active',
    phone: user.phone || '',
    employeeId: user.employeeId || '',
    password: '••••••••',
    initials,
    color,
    profilePictureUrl: user.profilePictureUrl || null,
    profilePictureCloudinaryId: user.profilePictureCloudinaryId || null,
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

// PATCH: update logged-in user's profile details
export const updateCurrentUserProfile = async (req, res, next) => {
  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({ status: 'error', message: 'A user with this email already exists' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    // Password change logic
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ status: 'error', message: 'Current password is required to change password' });
      }
      const isMatch = await user.comparePassword(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ status: 'error', message: 'Incorrect current password' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ status: 'error', message: 'New password must be at least 6 characters long' });
      }
      user.password = newPassword;
    }

    await user.save();

    // Log to Audit Log
    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: 'PROFILE_UPDATED',
      targetType: 'User',
      targetId: user._id.toString(),
      departmentId: user.departmentIds && user.departmentIds.length > 0 ? user.departmentIds[0].toString() : undefined,
      metadata: { 
        description: newPassword 
          ? 'Administrator updated their profile and changed password' 
          : 'Administrator updated their profile' 
      }
    });

    res.status(200).json({
      status: 'success',
      data: toLoggedInUserFe(user)
    });
  } catch (err) {
    next(err);
  }
};

// POST: upload profile picture to Cloudinary and update User record
export const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Upload new image to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, 'profile_pictures');

    const oldCloudinaryId = user.profilePictureCloudinaryId;

    user.profilePictureUrl = uploadResult.secure_url;
    user.profilePictureCloudinaryId = uploadResult.public_id;
    await user.save();

    // Clean up old Cloudinary asset if replaced
    if (oldCloudinaryId) {
      try {
        await deleteFromCloudinary(oldCloudinaryId);
      } catch (err) {
        console.error('Failed to delete old profile picture from Cloudinary:', err);
      }
    }

    // Log to Audit Log
    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: 'PROFILE_PICTURE_UPLOADED',
      targetType: 'User',
      targetId: user._id.toString(),
      departmentId: user.departmentIds && user.departmentIds.length > 0 ? user.departmentIds[0].toString() : undefined,
      metadata: { description: 'Administrator uploaded a profile picture' }
    });

    res.status(200).json({
      status: 'success',
      data: toLoggedInUserFe(user)
    });
  } catch (err) {
    next(err);
  }
};

// DELETE: remove profile picture
export const deleteProfilePicture = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const oldCloudinaryId = user.profilePictureCloudinaryId;
    if (!oldCloudinaryId) {
      return res.status(400).json({ status: 'error', message: 'No profile picture to delete' });
    }

    user.profilePictureUrl = null;
    user.profilePictureCloudinaryId = null;
    await user.save();

    // Delete image from Cloudinary
    try {
      await deleteFromCloudinary(oldCloudinaryId);
    } catch (err) {
      console.error('Failed to delete profile picture from Cloudinary:', err);
    }

    // Log to Audit Log
    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: 'PROFILE_PICTURE_DELETED',
      targetType: 'User',
      targetId: user._id.toString(),
      departmentId: user.departmentIds && user.departmentIds.length > 0 ? user.departmentIds[0].toString() : undefined,
      metadata: { description: 'Administrator removed profile picture' }
    });

    res.status(200).json({
      status: 'success',
      data: toLoggedInUserFe(user)
    });
  } catch (err) {
    next(err);
  }
};
