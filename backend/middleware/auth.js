const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { User } = require('../models');

const rejected = (req, reason) => {
  if (process.env.NODE_ENV === 'production') {
    // Never log authorization headers, token contents, user details, or query strings.
    console.warn('Authentication rejected', JSON.stringify({
      method: req.method,
      scope: req.baseUrl || '/api',
      reason,
    }));
  }
};

// Verifies the Bearer token and loads a fresh, active user on every request.
exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.get('authorization') || '';
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) {
    rejected(req, header ? 'malformed_authorization' : 'missing_authorization');
    throw new ApiError(401, header ? 'Invalid authorization format' : 'Authentication required');
  }
  const token = match[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const reason = error.name === 'TokenExpiredError'
      ? 'expired_token'
      : error.name === 'NotBeforeError'
        ? 'inactive_token'
        : error.message === 'invalid signature'
          ? 'invalid_signature'
          : 'malformed_or_invalid_token';
    rejected(req, reason);
    throw new ApiError(401, 'Invalid or expired token');
  }

  if (!payload || typeof payload.id !== 'string') {
    rejected(req, 'missing_subject');
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.id);
  if (!user || !user.isActive) {
    rejected(req, 'account_missing_or_inactive');
    throw new ApiError(401, 'Account not found or deactivated');
  }
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    rejected(req, 'password_changed');
    throw new ApiError(401, 'Password was changed. Please log in again');
  }
  req.user = user;
  next();
});

// Role-based access control: authorize('admin', 'hod')
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Authentication required'));
  if (!roles.includes(req.user.role)) return next(new ApiError(403, 'You do not have permission to perform this action'));
  next();
};
