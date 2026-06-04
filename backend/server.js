require('dotenv').config();

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
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Security headers — CSP relaxed for API-only backend (no HTML served)
app.use(helmet({
  contentSecurityPolicy: false, // frontend handles its own CSP
  crossOriginEmbedderPolicy: false
}));

// Strip MongoDB operator injection ($gt, $where, etc.) from request bodies
app.use(mongoSanitize());

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(logger);

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/map', mapRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'FoodBridge API is running!', timestamp: new Date().toISOString(), Status: 'OK' });
});

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
