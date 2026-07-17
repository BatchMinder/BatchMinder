import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Department from '../models/department.js';
import Session from '../models/session.js';
import { hashToken } from '../utils/tokenHash.js';

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

// FR-1.4: inactivity-based session timeout. This is independent of the
// refresh token's absolute 7-day expiry — a session idle longer than this
// window is terminated even if the 7-day cookie is still technically valid.
const INACTIVITY_TIMEOUT_MS =
  parseInt(process.env.SESSION_INACTIVITY_TIMEOUT_MINUTES || '30', 10) * 60 * 1000;

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
};

const populateFallbackDepartments = async (user) => {
  if (user && user.role !== 'dean' && (!user.departmentIds || user.departmentIds.length === 0)) {
    if (user.dept && user.dept !== 'All Departments') {
      const dept = await Department.findOne({ name: { $regex: new RegExp('^' + user.dept + '$', 'i') } });
      if (dept) {
        user.departmentIds = [dept._id];
      }
    } else if (user.dept === 'All Departments') {
      const depts = await Department.find({});
      user.departmentIds = depts.map(d => d._id);
    }
  }
};

export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;
 
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
 
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findById(decoded.id);
        if (currentUser) {
          await populateFallbackDepartments(currentUser);
          currentUser.lastActivityAt = new Date();
          User.updateOne({ _id: currentUser._id }, { lastActivityAt: currentUser.lastActivityAt }).catch(() => {});
          req.user = currentUser;
          return next();
        }
      } catch (err) {
        // Access token verification failed. Fallback to check refresh token below.
        console.log('Access token invalid or expired. Checking refresh token...');
      }
    }

    // Try using refresh token
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'You are not logged in. Please log in to get access.' });
    }

    try {
      const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
      const currentUser = await User.findById(decodedRefresh.id);
      
      if (!currentUser) {
        return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
      }

      // Session must exist server-side and not be revoked. A cryptographically
      // valid JWT alone is no longer enough — this is what lets logout / password
      // reset actually force a session out, instead of it staying valid until
      // its 7-day cookie naturally expires.
      const session = await Session.findOne({
        userId: currentUser._id,
        tokenHash: hashToken(refreshToken),
      });
      if (!session || session.revoked) {
        clearAuthCookies(res);
        return res.status(401).json({ message: 'Session has been revoked. Please log in again.' });
      }

      // FR-1.4: reject the silent refresh if the user has been idle longer than
      // the configured inactivity window, even though the 7-day cookie itself
      // hasn't expired yet.
      const lastActivity = currentUser.lastActivityAt ? new Date(currentUser.lastActivityAt).getTime() : 0;
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
        clearAuthCookies(res);
        return res.status(401).json({ message: 'Session expired due to inactivity. Please log in again.' });
      }

      await populateFallbackDepartments(currentUser);

      // Silent refresh: generate a new access token
      const newAccessToken = jwt.sign({ id: currentUser._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      });

      const accessDuration = parseExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN || '15m');
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(Date.now() + accessDuration),
      });

      currentUser.lastActivityAt = new Date();
      User.updateOne({ _id: currentUser._id }, { lastActivityAt: currentUser.lastActivityAt }).catch(() => {});

      req.user = currentUser;
      return next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Authentication error. Please log in again.' });
  }
};
