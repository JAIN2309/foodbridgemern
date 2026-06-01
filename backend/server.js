require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const logger = require('./middleware/logger');
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const userRoutes = require('./routes/users');
const mapRoutes = require('./routes/map');
const { startCronJobs } = require('./services/cronService');
const expiryScheduler  = require('./jobs/expiryScheduler');
const redis            = require('./utils/redisClient');

const app = express();

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
  res.json({ message: 'FoodBridge API is running!', timestamp: new Date().toISOString() ,"Status": "OK"
  });
});

const mockIO = {
  emit: (event, data) => console.log(`Socket event: ${event}`, data),
  to: (room) => ({ emit: (event, data) => console.log(`Socket to ${room}: ${event}`, data) })
};
app.set('io', mockIO);

async function start() {
  // Redis — optional, app works without it
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
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Network: http://10.0.2.2:${PORT}`);
    });
  }
}

start();

module.exports = app;
