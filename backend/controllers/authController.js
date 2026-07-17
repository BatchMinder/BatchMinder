import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/user.js';
import AuditLog from '../models/auditLog.js';
import { scopeQueryToRole } from '../middleware/scopeMiddleware.js';
import { logAudit as sharedLogAudit } from '../utils/logger.js';
import { sendEmail } from '../utils/email.js';


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

export const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: 'Please provide email and role' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    // 1. Find user by email and role
    const user = await User.findOne({ email: normalizedEmail, role });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email and role combination' });
    }

    // 2. Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP and set expires (10 minutes)
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    
    user.passwordResetToken = hashedOtp;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    // 3. Send email with OTP code
    const messageHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px; background-color: #2563eb; border-radius: 12px; color: #ffffff;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 16px; margin-bottom: 4px;">One-Time Password (OTP)</h2>
          <p style="font-size: 13px; color: #64748b; margin: 0;">BatchMinder Portal Account Recovery</p>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Hello <strong>${user.name}</strong>,
        </p>
        
        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          We received a request to reset the password for your account associated with the email <strong>${normalizedEmail}</strong> and role <strong>${role}</strong>. Please use the following 6-digit One-Time Password (OTP) to complete your password reset:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 16px 36px; background-color: #f1f5f9; border: 1px solid #e2e8f0; color: #0f172a; font-family: monospace; font-weight: 800; font-size: 32px; letter-spacing: 6px; border-radius: 16px;">
            ${otp}
          </div>
        </div>
        
        <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin-bottom: 20px; text-align: center;">
          This OTP code is valid for <strong>10 minutes</strong>. If you did not request this code, you can safely ignore this email; your account remains secure.
        </p>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
        
        <p style="font-size: 11px; line-height: 1.4; color: #94a3b8; text-align: center;">
          BatchMinder System Security Notification • Please do not share this code with anyone.
        </p>
      </div>
    `;

    await sendEmail({
      to: normalizedEmail,
      subject: `BatchMinder Recovery Code: ${otp}`,
      html: messageHtml
    });

    await logAudit(user._id, user.email, 'PASSWORD_RESET_REQUESTED', `OTP requested for role: ${role}`);

    res.status(200).json({
      status: 'success',
      message: 'OTP verification code sent to your email address'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { otp, token, email, role, password } = req.body;

    const submittedCode = otp || token;

    if (!submittedCode || !email || !role || !password) {
      return res.status(400).json({ message: 'All fields are required (otp, email, role, password)' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Hash the submitted code to compare it with the stored token
    const hashedOtp = crypto.createHash('sha256').update(submittedCode.trim()).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      role,
      passwordResetToken: hashedOtp,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid OTP code or verification session has expired. Please request a new code.'
      });
    }

    // Set new password (the model pre-save hook will hash it)
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // Log action
    await logAudit(user._id, user.email, 'PASSWORD_RESET_SUCCESS', `Password reset completed successfully via OTP for role: ${role}`);

    // Auto-login user
    sendTokenCookies(res, user._id);

    // Hide password
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



