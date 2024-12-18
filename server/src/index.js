const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');
const { setupSocketHandlers } = require('./socket');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Get port from environment variable or use default
const PORT = process.env.PORT || 5000;

// Initialize database
require('./database');

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
  // process.exit(1);
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
  // process.exit(1);
});

try {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "https://chatify-new.vercel.app",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
      allowedHeaders: ["Content-Type", "x-auth-token"]
    }
  });

  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || "https://chatify-new.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "x-auth-token"]
  }));
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/groups', groupRoutes);

  // Make io available globally
  global.io = io;

  // Socket.io setup
  setupSocketHandlers(io);

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
  });

  // Start server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error('Server initialization error:', error);
}