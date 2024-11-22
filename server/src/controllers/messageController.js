const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage }).single('media');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const messageController = {
  getMessages: async (req, res) => {
    const { userId } = req.params;
    const myId = req.user.userId;

    db.all(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND recipient_id = ?)
       OR (sender_id = ? AND recipient_id = ?)
       ORDER BY created_at ASC`,
      [myId, userId, userId, myId],
      (err, messages) => {
        if (err) {
          return res.status(500).json({ message: 'Error fetching messages' });
        }
        res.json(messages);
      }
    );
  },

  sendMessage: async (req, res) => {
    const { recipientId, content, messageType = 'text', mediaUrl = null } = req.body;
    const senderId = req.user.userId;

    db.run(
      'INSERT INTO messages (sender_id, recipient_id, content, message_type, media_url) VALUES (?, ?, ?, ?, ?)',
      [senderId, recipientId, content, messageType, mediaUrl],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Error sending message' });
        }
        res.json({
          id: this.lastID,
          sender_id: senderId,
          recipient_id: recipientId,
          content,
          message_type: messageType,
          media_url: mediaUrl,
          created_at: new Date()
        });
      }
    );
  },

  uploadMedia: async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(500).json({ message: 'Error uploading file' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ 
        url: fileUrl,
        type: req.file.mimetype,
        filename: req.file.originalname
      });
    });
  }
};

module.exports = messageController; 