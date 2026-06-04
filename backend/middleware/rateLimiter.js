const redis = require('../utils/redisClient');

const getIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown';

// In-memory fallback when Redis is down (fail secure)
const memFallback = new Map();
const memIncr = (key, windowMs) => {
  const now = Date.now();
  const e = memFallback.get(key);
  if (!e || now > e.resetAt) { memFallback.set(key, { count: 1, resetAt: now + windowMs }); return 1; }
  return ++e.count;
};
const memSAdd = (key, value, windowMs) => {
  const now = Date.now();
  const e = memFallback.get(key);
  if (!e || now > e.resetAt) { memFallback.set(key, { set: new Set([value]), resetAt: now + windowMs }); return 1; }
  e.set.add(value);
  return e.set.size;
};

const incrKey = async (key, windowSeconds) => {
  let count = await redis.incr(key);
  if (count === null) return memIncr(key, windowSeconds * 1000);
  if (count === 1) await redis.expire(key, windowSeconds);
  return count;
};

// Track distinct emails attempted from one IP (catches password spraying)
// Legitimate users on shared WiFi each try only their own email → low distinct count
// Sprayer tries 50 different emails → high distinct count → blocked
const trackDistinctEmails = async (ip, email, windowSeconds) => {
  const key = `rl:spray:${ip}`;
  const client = redis.getClient();

  if (!client) {
    return memSAdd(key, email, windowSeconds * 1000);
  }

  try {
    await client.sAdd(key, email);
    const count = await client.sCard(key);
    if (count === 1) await client.expire(key, windowSeconds);
    return count;
  } catch {
    return memSAdd(key, email, windowSeconds * 1000);
  }
};

// Login limiter:
//   - Per-email counter    → stops brute force on one account (IP-agnostic)
//   - Per-IP distinct-set  → stops password spraying (only triggers when many DIFFERENT accounts tried)
//   Genuine shared-WiFi users each try their own account → distinct set stays small → never blocked
const loginLimiter = async (req, res, next) => {
  const email = req.body?.email?.toLowerCase();
  const ip    = getIp(req);
  if (!email) return next();

  // 1. Per-account brute force check
  const emailCount = await incrKey(`rl:login:email:${email}`, 15 * 60);
  if (emailCount > 5) {
    const ttl = (await redis.getClient()?.ttl(`rl:login:email:${email}`)) || 900;
    return res.status(429).json({
      message: `Too many login attempts for this account. Try again in ${Math.ceil(ttl / 60)} minute(s).`,
      retryAfterSeconds: ttl,
      blockedBy: 'account'
    });
  }

  // 2. Password spraying check — how many DISTINCT accounts has this IP tried?
  // Threshold 50: a real café/office rarely has 50 people logging in within 15 min
  // A sprayer hits hundreds of accounts → easily caught
  const distinctCount = await trackDistinctEmails(ip, email, 15 * 60);
  if (distinctCount > 50) {
    return res.status(429).json({
      message: 'Suspicious activity detected from your network. Try again in 15 minutes.',
      retryAfterSeconds: 900,
      blockedBy: 'network'
    });
  }

  res.setHeader('X-RateLimit-Remaining', Math.max(0, 5 - emailCount));
  next();
};

// Register — IP raw count (no account yet to key on)
const registerLimiter = async (req, res, next) => {
  const ip = getIp(req);
  const count = await incrKey(`rl:register:${ip}`, 60 * 60);
  if (count > 3) {
    return res.status(429).json({
      message: 'Too many registration attempts from this network. Try again in an hour.',
      retryAfterSeconds: 3600
    });
  }
  next();
};

// Password reset — per email only
const passwordResetLimiter = async (req, res, next) => {
  const email = req.body?.email?.toLowerCase();
  if (!email) return next();
  const count = await incrKey(`rl:reset:${email}`, 60 * 60);
  if (count > 3) {
    return res.status(429).json({
      message: `Too many reset attempts for this account. Try again in an hour.`,
      retryAfterSeconds: 3600
    });
  }
  next();
};

// OTP verification — per IP, 10 attempts per 15 min
// OTP also has a per-account attempts counter in MongoDB (≤5) as a second layer
const otpLimiter = async (req, res, next) => {
  const ip = getIp(req);
  const count = await incrKey(`rl:otp:${ip}`, 15 * 60);
  if (count > 10) {
    return res.status(429).json({
      message: 'Too many OTP attempts from this network. Try again in 15 minutes.',
      retryAfterSeconds: 900
    });
  }
  next();
};

// Sync-offline — per user, 20 syncs per minute (prevents spam)
const syncLimiter = async (req, res, next) => {
  const userId = req.user?._id || req.user?.id || getIp(req);
  const count = await incrKey(`rl:sync:${userId}`, 60);
  if (count > 20) {
    return res.status(429).json({
      message: 'Sync rate limit exceeded. Wait 1 minute.',
      retryAfterSeconds: 60
    });
  }
  next();
};

module.exports = { loginLimiter, registerLimiter, passwordResetLimiter, otpLimiter, syncLimiter };
