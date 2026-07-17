import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import AuditLog from '../models/auditLog.js';
import Session from '../models/session.js';
import { hashToken } from '../utils/tokenHash.js';
import { scopeQueryToRole } from '../middleware/scopeMiddleware.js';
import { logAudit as sharedLogAudit } from '../utils/logger.js';

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

const sendTokenCookies = async (req, res, userId) => {
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

  // Record this refresh token server-side so it can be revoked on demand
  // (e.g. force-logout after a password reset), independent of its own JWT expiry.
  try {
    await Session.create({
      userId,
      tokenHash: hashToken(refreshToken),
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  } catch (err) {
    console.error('Failed to create session record:', err);
  }
};

// Revokes every active session for a user — call this after a password reset
// or whenever all existing logins should be forced to re-authenticate.
export const revokeAllSessionsForUser = async (userId) => {
  await Session.updateMany({ userId, revoked: false }, { revoked: true });
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

    await sendTokenCookies(req, res, newUser._id);

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

    await sendTokenCookies(req, res, user._id);

    // Log action
    await logAudit(user._id, user.email, 'USER_LOGGED_IN', 'User logged in successfully.', user.role, req.ip);

    // Update lastLogin and start the inactivity clock (FR-1.4)
    user.lastLogin = new Date();
    user.lastActivityAt = new Date();
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

    // Revoke the server-side session tied to this refresh token so it can't be
    // silently reused even if the JWT itself hasn't expired yet.
    if (req.cookies && req.cookies.refreshToken) {
      try {
        await Session.updateOne(
          { tokenHash: hashToken(req.cookies.refreshToken) },
          { revoked: true }
        );
      } catch (err) {
        console.error('Failed to revoke session on logout:', err);
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
export const setupDean = async (req, res) => {
  try {
    const { name, email, password, secret } = req.body;

    if (!email || !password || !secret) {
      return res.status(400).json({ message: 'Email, password, and secret key are required' });
    }

    const expectedSecret = process.env.DEAN_SETUP_SECRET;
    // Fail closed: if the env var isn't configured, refuse rather than fall back
    // to a hardcoded default that would be visible to anyone with repo access.
    if (!expectedSecret) {
      console.error('DEAN_SETUP_SECRET is not set in the environment.');
      return res.status(503).json({ message: 'Dean setup is not configured on this server.' });
    }
    if (secret !== expectedSecret) {
      return res.status(403).json({ message: 'Invalid secret key' });
    }

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase().trim(), role: 'dean' });
    if (user) {
      // Update password
      user.password = password;
      if (name) user.name = name;
      await user.save();
      await logAudit(user._id, user.email, 'DEAN_RECOVERED', 'Dean password reset completed via secret link.');
      return res.status(200).json({
        status: 'success',
        message: 'Dean password updated successfully'
      });
    }

    // Create new dean
    user = await User.create({
      name: name || 'Dean',
      email: email.toLowerCase().trim(),
      password,
      role: 'dean'
    });

    await logAudit(user._id, user.email, 'DEAN_CREATED', 'New Dean account registered via secret link.');

    res.status(201).json({
      status: 'success',
      message: 'Dean registered successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};