const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const userRoutes = require('./routes/users');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodbridge')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Error:', err));

// Socket.io Connection
io.on('connection', (socket) => {
  const timestamp = new Date().toLocaleString();
  console.log(`[${timestamp}] User connected: ${socket.id}`);
  
  socket.on('join-ngo-room', (ngoId) => {
    socket.join(`ngo-${ngoId}`);
    console.log(`[${timestamp}] NGO ${ngoId} joined room`);
  });
  
  socket.on('disconnect', () => {
    const disconnectTime = new Date().toLocaleString();
    console.log(`[${disconnectTime}] User disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});