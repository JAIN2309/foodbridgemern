require('dotenv').config();

// Sentry — graceful: app still starts even if package not yet installed
let Sentry = null;
try {
  Sentry = require('@sentry/node');
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      sendDefaultPii: true,        // captures user email, IP on every event
      tracesSampleRate: 0.2,
    });
    console.log('✅ Sentry (backend) initialised');
  }
} catch { /* @sentry/node not installed yet — run: npm install @sentry/node */ }

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const logger = require('./middleware/logger');
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const userRoutes = require('./routes/users');
const mapRoutes = require('./routes/map');
const { startCronJobs } = require('./services/cronService');
const expiryScheduler  = require('./jobs/expiryScheduler');
const redis            = require('./utils/redisClient');

const http = require('http');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = process.env.CLIENT_URL
        ? process.env.CLIENT_URL.split(',').map(o => o.trim())
        : ['http://localhost:5173', 'http://localhost:3000'];
      callback(null, allowed.includes(origin));
    },
    methods: ['GET', 'POST']
  }
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,       // frontend (Vite) manages its own CSP
  crossOriginEmbedderPolicy: false,   // needed for leaflet map tiles
  permissionsPolicy: {
    policy: {
      geolocation:      ['self'],     // only our frontend can request GPS
      camera:           ['self'],     // only our frontend can use camera
      microphone:       [],           // nobody — no voice features
      payment:          [],           // nobody — no payment APIs
      usb:              [],           // nobody — no hardware access
      'interest-cohort': [],          // opt out of FLoC tracking
    }
  }
}));

// Strip MongoDB operator injection ($gt, $where, etc.) from req body/query/params
app.use(mongoSanitize());

// CORS — explicit allowlist; '*' wildcard is a CSRF attack surface in production
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(logger);

// Sentry v8: no requestHandler needed — init() auto-instruments express

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/map', mapRoutes);

// ─── Root status ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  const mongoose = require('mongoose');
  const redisStatus = (() => { try { return redis.getClient()?.isReady ? 'connected' : 'disconnected'; } catch { return 'unknown'; } })();
  res.json({
    name:        'FoodBridge API',
    version:     '1.0.0',
    status:      'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp:   new Date().toISOString(),
    uptime_sec:  Math.floor(process.uptime()),
    database: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis:   redisStatus
    },
    docs: '/api/info'
  });
});

// ─── API info ─────────────────────────────────────────────────────────────────
app.get('/api/info', (req, res) => {
  res.json({
    name:    'FoodBridge API',
    version: '1.0.0',
    description: 'Food donation platform connecting restaurants/hotels (donors) with NGOs',
    base_url: '/api',
    total_endpoints: 40,
    roles: ['donor', 'ngo', 'admin'],
    endpoints: {
      public: [
        { method: 'POST', path: '/api/auth/register',               description: 'Create donor or NGO account' },
        { method: 'POST', path: '/api/auth/login',                  description: 'Sign in — returns JWT token' },
        { method: 'POST', path: '/api/auth/verify-password',        description: 'Verify password (biometric setup)' },
        { method: 'POST', path: '/api/auth/request-password-reset', description: 'Request OTP for password reset' },
        { method: 'POST', path: '/api/auth/verify-otp',             description: 'Validate 6-digit OTP' },
        { method: 'POST', path: '/api/auth/reset-password',         description: 'Set new password after OTP verified' },
        { method: 'GET',  path: '/api/users/health',                description: 'Backend + DB health check' },
        { method: 'POST', path: '/api/donations/sms-webhook',       description: 'Twilio SMS fallback (signed requests only)' },
      ],
      all_roles: [
        { method: 'GET',    path: '/api/auth/profile',              description: 'Get own profile' },
        { method: 'PUT',    path: '/api/auth/profile',              description: 'Update own profile' },
        { method: 'POST',   path: '/api/auth/logout',               description: 'Revoke JWT token' },
        { method: 'PUT',    path: '/api/auth/push-token',           description: 'Save FCM push notification token' },
        { method: 'PUT',    path: '/api/users/biometric/toggle',    description: 'Enable/disable biometric login' },
        { method: 'GET',    path: '/api/users/biometric/status',    description: 'Check biometric status' },
        { method: 'POST',   path: '/api/users/profile-picture',     description: 'Upload profile picture (base64, max 2MB)' },
        { method: 'GET',    path: '/api/users/profile-picture',     description: 'Get profile picture' },
        { method: 'DELETE', path: '/api/users/profile-picture',     description: 'Remove profile picture' },
        { method: 'POST',   path: '/api/donations/sync-offline',    description: 'Sync queued offline actions (max 50)' },
        { method: 'GET',    path: '/api/donations/offline-package', description: 'Download offline data pack' },
      ],
      donor: [
        { method: 'POST', path: '/api/donations',                   description: 'Post a new food donation (with photo)' },
        { method: 'GET',  path: '/api/donations/history/donor',     description: 'Own donation history (paginated)' },
        { method: 'POST', path: '/api/donations/:id/rate-ngo',      description: 'Rate the NGO after collection (1–5 stars)' },
      ],
      ngo: [
        { method: 'GET',  path: '/api/donations/nearby',            description: 'Nearby available donations (geo-filtered, cached 2min)' },
        { method: 'POST', path: '/api/donations/:id/claim',         description: 'Claim donation — instant (30min) or scheduled' },
        { method: 'POST', path: '/api/donations/:id/collect',       description: 'Mark collected + rate donor (1–5 stars)' },
        { method: 'POST', path: '/api/donations/:id/release',       description: 'Release donation back to available' },
        { method: 'GET',  path: '/api/donations/history/ngo',       description: 'Own claims history (cached 30s)' },
      ],
      admin: [
        { method: 'GET',  path: '/api/users/pending',               description: 'Pending verifications (paginated, cached 1min)' },
        { method: 'PUT',  path: '/api/users/:id/verify',            description: 'Approve or reject user' },
        { method: 'PUT',  path: '/api/users/:id/status',            description: 'Activate or deactivate account' },
        { method: 'GET',  path: '/api/users/:id/detail',            description: 'Full user detail + donation stats (cached 2min)' },
        { method: 'GET',  path: '/api/users/stats',                 description: 'Platform KPI stats (cached 5min)' },
        { method: 'GET',  path: '/api/users/export/analytics',      description: 'Export analytics (cached 2min, rate limited)' },
        { method: 'GET',  path: '/api/users/ratings/summary',       description: 'Ratings leaderboard + review feed (cached 5min)' },
        { method: 'GET',  path: '/api/users/donations/all',         description: 'All active donations for map (cached 1min)' },
        { method: 'GET',  path: '/api/users/all',                   description: 'All users paginated + search (cached 1min)' },
        { method: 'GET',  path: '/api/donations/admin/history',     description: 'Full donation history paginated' },
        { method: 'POST', path: '/api/donations/:id/admin-release', description: 'Force-release any reserved donation' },
      ],
      map: [
        { method: 'POST', path: '/api/map/nearby',   description: 'Find nearby locations by type (auth required)' },
        { method: 'POST', path: '/api/map/distance', description: 'Calculate distance between two points (auth required)' },
      ]
    },
    security: {
      authentication: 'JWT Bearer token',
      rate_limiting:  'Redis-backed per-account/IP (varies by endpoint)',
      input_validation: 'express-validator on all write endpoints',
      headers: 'helmet.js — HSTS, X-Frame-Options, X-Content-Type-Options',
      sanitisation: 'express-mongo-sanitize — strips $ operator injection'
    },
    caching: {
      engine: 'Redis',
      strategy: 'Cache-aside with explicit invalidation on data change',
      ttls: { nearby: '2min', ngo_history: '30s', donor_history: '1min', admin_stats: '5min', ratings: '5min' }
    }
  });
});

// Sentry v8 error handler — captures unhandled errors and sends to Sentry
if (Sentry) Sentry.setupExpressErrorHandler(app);

// Real Socket.IO — clients join their own rooms so targeted events work
io.on('connection', (socket) => {
  socket.on('join-ngo-room',   (userId) => socket.join(`ngo-${userId}`));
  socket.on('join-donor-room', (userId) => socket.join(`donor-${userId}`));
  socket.on('disconnect', () => {});
});

app.set('io', io);

async function start() {
  await redis.connect();

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Fix MONGODB_URI in .env and restart.');
    process.exit(1);
  }

  if (process.env.NODE_ENV !== 'production') {
    startCronJobs();
  }
  expiryScheduler.start();

  if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Network: http://10.0.2.2:${PORT}`);
    });
  }
}

start();

module.exports = app;
