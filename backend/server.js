const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const logger = require('./middleware/logger');
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const userRoutes = require('./routes/users');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());
app.use(logger); // Add logging middleware

// MongoDB Connection
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodbridge');
    isConnected = true;
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB Error:', err);
  }
};

// Connect to DB on startup
connectDB();

// Mock Socket.io for Vercel compatibility
const mockIO = {
  emit: (event, data) => console.log(`Socket event: ${event}`, data),
  to: (room) => ({ emit: (event, data) => console.log(`Socket to ${room}: ${event}`, data) })
};
app.set('io', mockIO);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'FoodBridge API is running!', timestamp: new Date().toISOString() });
});

// For Vercel serverless
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;