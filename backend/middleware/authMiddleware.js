import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Department from '../models/department.js';

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

const populateFallbackDepartments = async (user) => {
  if (user && user.role !== 'super_admin' && (!user.departmentIds || user.departmentIds.length === 0)) {
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

      req.user = currentUser;
      return next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Authentication error. Please log in again.' });
  }
};
