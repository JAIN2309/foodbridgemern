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

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name:    'FoodBridge API',
    version: '1.0.0',
    status:  'running',
    health:  '/api/health'
  });
});

// ─── API info (minimal — no endpoint exposure) ────────────────────────────────
app.get('/api/info', (req, res) => {
  res.json({
    name:        'FoodBridge API',
    version:     '1.0.0',
    description: 'Food donation platform — connects donors with NGOs',
    environment: process.env.NODE_ENV || 'development',
    roles:       ['donor', 'ngo', 'admin'],
    health:      '/api/health'
  });
});

// ─── Health check with DB connectivity ───────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = (() => {
    try { return redis.getClient()?.isReady ? 'connected' : 'disconnected'; }
    catch { return 'unknown'; }
  })();

  const allOk = mongoStatus === 'connected' && redisStatus === 'connected';
  const istTime = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });

  res.status(allOk ? 200 : 503).json({
    status:     allOk ? 'ok' : 'degraded',
    timestamp:  `${istTime} IST`,
    uptime_sec: Math.floor(process.uptime()),
    services: {
      mongodb: mongoStatus,
      redis:   redisStatus
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

  const PORT = process.env.PORT || 5001;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`   Local:   http://localhost:${PORT}`);
      console.log(`   Network: http://10.0.2.2:${PORT}`);
    }
  });
}

start();

module.exports = app;
