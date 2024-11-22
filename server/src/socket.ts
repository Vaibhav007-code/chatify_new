import { Server, Socket } from 'socket.io';
import { verifyToken } from './utils/auth';
import User from './models/User';
import Message from './models/Message';

export const setupSocketHandlers = (io: Server) => {
  const connectedUsers = new Map();

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const decoded = verifyToken(token);
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    
    // Update user status to online
    await User.findByIdAndUpdate(userId, { online: true });
    connectedUsers.set(userId, socket.id);
    
    // Broadcast online status
    io.emit('userOnline', { userId });

    // Handle private messages
    socket.on('privateMessage', async (data) => {
      const { recipientId, content, messageType, mediaUrl } = data;
      
      const message = await Message.create({
        sender: userId,
        recipient: recipientId,
        content,
        messageType,
        mediaUrl
      });

      const recipientSocketId = connectedUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('newMessage', message);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(userId, { online: false });
      connectedUsers.delete(userId);
      io.emit('userOffline', { userId });
    });
  });
}; 