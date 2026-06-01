const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const redis = require('../utils/redisClient');

const USER_CACHE_TTL = 300; // 5 minutes

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    // Check JWT blacklist (logged-out tokens)
    const blacklisted = await redis.exists(`blacklist:${token}`);
    if (blacklisted) return res.status(401).json({ message: 'Token has been invalidated' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try Redis cache first — avoids DB hit on every request
    const cacheKey = `user:${decoded.userId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      req.user = JSON.parse(cached);
      return next();
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ message: 'Token is not valid' });

    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(user.toObject()), USER_CACHE_TTL);

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: 'Access denied' });
  next();
};

const requireVerified = (req, res, next) => {
  if (!req.user.is_verified && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Account not verified' });
  next();
};

module.exports = { auth, requireRole, requireVerified };
