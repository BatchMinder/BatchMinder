import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import AuditLog from '../models/auditLog.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const logAudit = async (userId, userEmail, action, description) => {
  try {
    await AuditLog.create({
      userId,
      userEmail,
      action,
      description,
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields (name, email, password)' });
    }

    // Check if user already exists with this specific role
    const targetRole = role || 'advisor';
    const existingUser = await User.findOne({ email: email.toLowerCase().trim(), role: targetRole });
    if (existingUser) {
      await logAudit(null, email, 'REGISTER_FAILED', `Attempted signup with already registered email: ${email} for role: ${targetRole}`);
      return res.status(400).json({ message: `User with this email and role (${targetRole}) already exists` });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      role: role || 'advisor',
    });

    const token = signToken(newUser._id);

    // Log action
    await logAudit(newUser._id, newUser.email, 'USER_REGISTERED', `New user registered with role: ${newUser.role}`);

    // Hide password before returning user object
    newUser.password = undefined;

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: newUser,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Please provide email, password, and role' });
    }

    // Find user matching email and role and include password field
    const user = await User.findOne({ email: email.toLowerCase().trim(), role }).select('+password');

    if (!user || !(await user.comparePassword(password, user.password))) {
      await logAudit(null, email, 'LOGIN_FAILED', `Attempted login to role: ${role} with invalid credentials.`);
      return res.status(401).json({ message: 'Incorrect email, password, or role' });
    }

    const token = signToken(user._id);

    // Log action
    await logAudit(user._id, user.email, 'USER_LOGGED_IN', 'User logged in successfully.');

    // Hide password
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
};

export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: {
        logs,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkEmail = async (req, res) => {
  try {
    const { email, role } = req.query;
    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role query parameters are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim(), role });
    res.status(200).json({
      status: 'success',
      exists: !!user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

