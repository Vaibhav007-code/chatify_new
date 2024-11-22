const jwt = require('jsonwebtoken');
const { db } = require('./database');

const connectedUsers = new Map();

const setupSocketHandlers = (io) => {
  // Function to broadcast user lists to all clients
  const broadcastUserLists = async () => {
    try {
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

      console.log('Connected Users:', Array.from(connectedUsers.keys()));
      console.log('Broadcasting users:', {
        all: updatedUsers.map(u => ({ id: u.id, username: u.username, online: u.online })),
        online: onlineUsers.map(u => ({ id: u.id, username: u.username }))
      });

      // Broadcast to ALL connected clients
      io.emit('userLists', {
        allUsers: updatedUsers,
        onlineUsers: onlineUsers
      });

      // Also emit individual online status updates
      onlineUsers.forEach(user => {
        io.emit('userOnline', {
          userId: user.id,
          username: user.username
        });
      });
    } catch (err) {
      console.error('Error broadcasting users:', err);
    }
  };

  // Handle private messages
  const handlePrivateMessage = async (socket, data) => {
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

      console.log('Message saved:', message);

      // Send to recipient if online
      const recipientSocket = connectedUsers.get(recipientId.toString());
      if (recipientSocket) {
        console.log('Sending message to recipient:', recipientId);
        io.to(recipientSocket.socketId).emit('newMessage', message);
      }

      // Send confirmation to sender
      socket.emit('messageSent', message);
      console.log('Message sent confirmation:', message);

    } catch (err) {
      console.error('Error handling private message:', err);
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  };

  io.on('connection', async (socket) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) throw new Error('Authentication error');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      const userId = decoded.userId;
      socket.userId = userId;

      // Get user info
      db.get('SELECT username FROM users WHERE id = ?', [userId], async (err, user) => {
        if (err || !user) {
          console.error('Error fetching user:', err);
          socket.disconnect();
          return;
        }

        // Store user connection
        connectedUsers.set(userId.toString(), {
          socketId: socket.id,
          username: user.username
        });

        console.log('User connected:', { userId, username: user.username });
        console.log('Current connected users:', Array.from(connectedUsers.entries()));

        // Handle private messages
        socket.on('privateMessage', (data) => handlePrivateMessage(socket, data));

        // Handle message history request
        socket.on('getMessageHistory', async ({ otherUserId }) => {
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
            console.log('Sent message history:', messages);
          } catch (err) {
            console.error('Error fetching message history:', err);
            socket.emit('messageError', { error: 'Failed to fetch message history' });
          }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
          // Wait a bit to see if it's just a reconnect
          setTimeout(async () => {
            const userConnection = connectedUsers.get(userId.toString());
            if (!userConnection || Date.now() - userConnection.lastPing > 10000) {
              connectedUsers.delete(userId.toString());
              console.log(`User ${user.username} (${userId}) disconnected`);

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
            }
          }, 5000);
        });

        // Handle typing status
        socket.on('typing', ({ recipientId }) => {
          const recipientSocket = connectedUsers.get(recipientId.toString());
          if (recipientSocket) {
            io.to(recipientSocket.socketId).emit('userTyping', {
              userId: socket.userId,
              username: connectedUsers.get(socket.userId.toString()).username
            });
          }
        });

        socket.on('stopTyping', ({ recipientId }) => {
          const recipientSocket = connectedUsers.get(recipientId.toString());
          if (recipientSocket) {
            io.to(recipientSocket.socketId).emit('userStoppedTyping', {
              userId: socket.userId
            });
          }
        });

        // Handle message seen
        socket.on('messageSeen', async ({ messageId }) => {
          try {
            const message = await new Promise((resolve, reject) => {
              db.get('SELECT * FROM messages WHERE id = ?', [messageId], (err, msg) => {
                if (err) reject(err);
                else resolve(msg);
              });
            });

            if (message) {
              db.run('UPDATE messages SET seen = 1, read = 1 WHERE id = ?', [messageId]);
              
              const senderSocket = connectedUsers.get(message.sender_id.toString());
              if (senderSocket) {
                io.to(senderSocket.socketId).emit('messageSeen', { messageId });
              }
            }
          } catch (err) {
            console.error('Error marking message as seen:', err);
          }
        });

        // Handle read receipts
        socket.on('messageRead', async ({ messageId }) => {
          try {
            const message = await new Promise((resolve, reject) => {
              db.get('SELECT * FROM messages WHERE id = ?', [messageId], (err, msg) => {
                if (err) reject(err);
                else resolve(msg);
              });
            });

            if (message) {
              db.run('UPDATE messages SET read = 1 WHERE id = ?', [messageId]);
              
              const senderSocket = connectedUsers.get(message.sender_id.toString());
              if (senderSocket) {
                io.to(senderSocket.socketId).emit('messageRead', { messageId });
              }
            }
          } catch (err) {
            console.error('Error marking message as read:', err);
          }
        });
      });
    } catch (err) {
      console.error('Error handling connection:', err);
      socket.disconnect();
    }
  });

  // Periodically broadcast user lists to ensure synchronization
  setInterval(broadcastUserLists, 5000);
};

module.exports = { setupSocketHandlers };