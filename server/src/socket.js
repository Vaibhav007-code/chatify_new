const jwt = require('jsonwebtoken');
const { db } = require('./database');

const connectedUsers = new Map();
let broadcastInterval = null;

const setupSocketHandlers = (io) => {
  // Function to broadcast user lists to all clients
  const broadcastUserLists = async () => {
    try {
      // Only broadcast if there are connected users
      if (connectedUsers.size === 0) {
        return;
      }

      // Get all registered users
      const users = await new Promise((resolve, reject) => {
        db.all('SELECT id, username, online FROM users ORDER BY username', [], (err, users) => {
          if (err) reject(err);
          else resolve(users);
        });
      });

      // Mark users as online based on socket connections
      const updatedUsers = users.map(user => ({
        ...user,
        online: connectedUsers.has(user.id.toString())
      }));

      // Get online users
      const onlineUsers = updatedUsers.filter(user => user.online);

      // Only broadcast if there are actual changes
      if (onlineUsers.length > 0) {
        // Broadcast to ALL connected clients
        io.emit('userLists', {
          allUsers: updatedUsers,
          onlineUsers: onlineUsers
        });
      }
    } catch (err) {
      console.error('Error broadcasting users:', err);
    }
  };

  // Handle private messages
  const handlePrivateMessage = async (socket, data) => {
    if (!socket.userId) {
      socket.emit('messageError', { error: 'Not authenticated' });
      return;
    }

    const { recipientId, content, messageType = 'text', mediaUrl = null } = data;

    try {
      // Save message to database
      const messageId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO messages (sender_id, recipient_id, content, message_type, media_url, read, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
          [socket.userId, recipientId, content, messageType, mediaUrl, 0],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // Get the complete message
      const message = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM messages WHERE id = ?', [messageId], (err, msg) => {
          if (err) reject(err);
          else resolve(msg);
        });
      });

      // Send to recipient if online
      const recipientSocket = connectedUsers.get(recipientId.toString());
      if (recipientSocket) {
        io.to(recipientSocket.socketId).emit('newMessage', message);
      }

      // Send confirmation to sender
      socket.emit('messageSent', message);
    } catch (err) {
      console.error('Error handling private message:', err);
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  };

  io.on('connection', async (socket) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        throw new Error('No authentication token provided');
      }
      
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      } catch (error) {
        throw new Error('Invalid authentication token');
      }

      const userId = decoded.userId;
      
      // Verify user exists in database
      const user = await new Promise((resolve, reject) => {
        db.get('SELECT id, username FROM users WHERE id = ?', [userId], (err, user) => {
          if (err) reject(err);
          else resolve(user);
        });
      });

      if (!user) {
        throw new Error('User not found');
      }

      socket.userId = userId;

      // Store user connection
      connectedUsers.set(userId.toString(), {
        socketId: socket.id,
        username: user.username,
        lastPing: Date.now()
      });

      // Update user's online status in database
      await new Promise((resolve, reject) => {
        db.run('UPDATE users SET online = ? WHERE id = ?', [1, userId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Broadcast updated user list
      await broadcastUserLists();

      // Handle private messages
      socket.on('privateMessage', (data) => handlePrivateMessage(socket, data));

      // Handle message history request
      socket.on('getMessageHistory', async ({ otherUserId }) => {
        if (!socket.userId) {
          socket.emit('messageError', { error: 'Not authenticated' });
          return;
        }

        try {
          const messages = await new Promise((resolve, reject) => {
            db.all(
              `SELECT * FROM messages 
               WHERE (sender_id = ? AND recipient_id = ?)
               OR (sender_id = ? AND recipient_id = ?)
               ORDER BY created_at ASC`,
              [socket.userId, otherUserId, otherUserId, socket.userId],
              (err, messages) => {
                if (err) reject(err);
                else resolve(messages);
              }
            );
          });

          socket.emit('messageHistory', messages);
        } catch (err) {
          console.error('Error fetching message history:', err);
          socket.emit('messageError', { error: 'Failed to fetch message history' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        connectedUsers.delete(userId.toString());

        // Update user's online status in database
        await new Promise((resolve, reject) => {
          db.run('UPDATE users SET online = ? WHERE id = ?', [0, userId], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Broadcast user offline status
        io.emit('userOffline', { userId });
        await broadcastUserLists();
      });

      // Handle typing status
      socket.on('typing', ({ recipientId }) => {
        if (!socket.userId) return;
        
        const recipientSocket = connectedUsers.get(recipientId.toString());
        if (recipientSocket) {
          io.to(recipientSocket.socketId).emit('userTyping', {
            userId: socket.userId,
            username: connectedUsers.get(socket.userId.toString()).username
          });
        }
      });

      socket.on('stopTyping', ({ recipientId }) => {
        if (!socket.userId) return;

        const recipientSocket = connectedUsers.get(recipientId.toString());
        if (recipientSocket) {
          io.to(recipientSocket.socketId).emit('userStoppedTyping', {
            userId: socket.userId
          });
        }
      });

      // Handle message seen
      socket.on('messageSeen', async ({ messageId }) => {
        if (!socket.userId) return;

        try {
          await new Promise((resolve, reject) => {
            db.run('UPDATE messages SET read = 1 WHERE id = ?', [messageId], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });

          io.emit('messageRead', { messageId });
        } catch (err) {
          console.error('Error marking message as seen:', err);
        }
      });

    } catch (error) {
      console.error('Socket authentication error:', error.message);
      socket.emit('error', { message: error.message });
      socket.disconnect(true);
    }
  });
};

module.exports = { setupSocketHandlers };