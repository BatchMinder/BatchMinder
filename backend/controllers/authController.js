import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import AuditLog from '../models/auditLog.js';
import { scopeQueryToRole } from '../middleware/scopeMiddleware.js';
import { logAudit as sharedLogAudit } from '../utils/logger.js';
import sendEmail from '../utils/email.js';

const parseExpiresIn = (str) => {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
};

const signAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const sendTokenCookies = (res, userId) => {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };

  const accessDuration = parseExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN || '15m');
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    expires: new Date(Date.now() + accessDuration),
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
};

const logAudit = async (userId, userEmail, action, description, role = '', ipAddress = null) => {
  try {
    let actorRole = role;
    if (userId && !actorRole) {
      const user = await User.findById(userId);
      if (user) actorRole = user.role;
    }
    await sharedLogAudit({
      actorId: userId || null,
      actorRole: actorRole || 'system',
      action,
      targetType: 'Auth',
      metadata: { 
        description,
        email: userEmail
      },
      ipAddress
    });
  } catch (err) {
    console.error('Audit logging failed inside authController:', err);
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
      await logAudit(null, email, 'REGISTER_FAILED', `Attempted signup with already registered email: ${email} for role: ${targetRole}`, targetRole);
      return res.status(400).json({ message: `User with this email and role (${targetRole}) already exists` });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      role: role || 'advisor',
    });

    sendTokenCookies(res, newUser._id);

    // Log action
    await logAudit(newUser._id, newUser.email, 'USER_REGISTERED', `New user registered with role: ${newUser.role}`);

    // Hide password before returning user object
    newUser.password = undefined;

    res.status(201).json({
      status: 'success',
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
      await logAudit(null, email, 'LOGIN_FAILED', `Attempted login to role: ${role} with invalid credentials.`, role, req.ip);
      return res.status(401).json({ message: 'Incorrect email, password, or role' });
    }

    sendTokenCookies(res, user._id);

    // Log action
    await logAudit(user._id, user.email, 'USER_LOGGED_IN', 'User logged in successfully.', user.role, req.ip);

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Hide password
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    let userId = null;
    let userEmail = 'unknown';

    if (req.cookies && req.cookies.accessToken) {
      try {
        const decoded = jwt.verify(req.cookies.accessToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          userId = user._id;
          userEmail = user.email;
        }
      } catch (err) {
        // ignore decoding errors during logout
      }
    }

    if (userId) {
      await logAudit(userId, userEmail, 'USER_LOGGED_OUT', 'User logged out successfully.');
    }

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    };

    res.cookie('accessToken', 'loggedout', {
      ...cookieOptions,
      expires: new Date(Date.now() + 1000),
    });

    res.cookie('refreshToken', 'loggedout', {
      ...cookieOptions,
      expires: new Date(Date.now() + 1000),
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
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
// getAuditLogs has been moved to auditLogController.js

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
export const setupSuperAdmin = async (req, res) => {
  try {
    const { name, email, password, secret } = req.body;

    if (!email || !password || !secret) {
      return res.status(400).json({ message: 'Email, password, and secret key are required' });
    }

    if (secret !== 'BatchMinderSecretKey2026') {
      return res.status(403).json({ message: 'Invalid secret key' });
    }

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase().trim(), role: 'super_admin' });
    if (user) {
      // Update password
      user.password = password;
      if (name) user.name = name;
      await user.save();
      await logAudit(user._id, user.email, 'SUPER_ADMIN_RECOVERED', 'Super admin password reset completed via secret link.');
      return res.status(200).json({
        status: 'success',
        message: 'Super admin password updated successfully'
      });
    }

    // Create new super admin
    user = await User.create({
      name: name || 'Super Admin',
      email: email.toLowerCase().trim(),
      password,
      role: 'super_admin'
    });

    await logAudit(user._id, user.email, 'SUPER_ADMIN_CREATED', 'New Super Admin account registered via secret link.');

    res.status(201).json({
      status: 'success',
      message: 'Super admin registered successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST: Request password reset (generates OTP)
export const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ message: 'Please provide email and role' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), role });
    if (!user) {
      // Return 200 for security, but log locally
      console.log(`Password reset requested for non-existent user: ${email} with role: ${role}`);
      return res.status(200).json({
        status: 'success',
        message: 'If a matching user was found, a password reset code has been sent.'
      });
    }

    // Generate a random 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set code and expiration (10 minutes)
    user.passwordResetToken = otp;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    // Log audit
    await logAudit(user._id, user.email, 'PASSWORD_RESET_REQUESTED', `Password reset OTP generated.`, user.role);

    // Send actual email (using configured SMTP or fallback to Ethereal)
    const emailMessage = `
Hello ${user.name},

You requested a password reset for your BatchMinder account.
Your 6-digit OTP verification code is: ${otp}

This code will expire in 10 minutes. If you did not request this, please ignore this email.

BatchMinder System Security
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'BatchMinder - Password Reset OTP',
        message: emailMessage,
      });
    } catch (err) {
      console.error('Email could not be sent', err);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: 'There was an error sending the email. Try again later!' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Password reset code has been generated.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST: Reset password using OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, role, otp, newPassword } = req.body;
    if (!email || !role || !otp || !newPassword) {
      return res.status(400).json({ message: 'Please provide email, role, OTP code, and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), role })
      .select('+passwordResetToken +passwordResetExpires');

    if (!user || user.passwordResetToken !== otp || user.passwordResetExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP verification code' });
    }

    // Reset password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log audit
    await logAudit(user._id, user.email, 'PASSWORD_RESET_SUCCESS', `Password successfully updated.`, user.role);

    res.status(200).json({
      status: 'success',
      message: 'Password has been successfully updated. You can now log in.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
