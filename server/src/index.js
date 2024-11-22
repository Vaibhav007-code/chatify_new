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

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

try {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'https://chatify-new.vercel.app',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://chatify-new.vercel.app',
    credentials: true
  }));
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/groups', groupRoutes);

  // Socket.io setup
  setupSocketHandlers(io);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error('Server Error:', error);
  process.exit(1);
}