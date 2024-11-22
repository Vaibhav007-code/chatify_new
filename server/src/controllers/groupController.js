const db = require('../database');

const groupController = {
  createGroup: async (req, res) => {
    const { name, members } = req.body;
    const adminId = req.user.userId;

    db.run(
      'INSERT INTO groups (name, admin_id) VALUES (?, ?)',
      [name, adminId],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Error creating group' });
        }

        const groupId = this.lastID;
        const memberValues = members.map(memberId => 
          `(${groupId}, ${memberId})`
        ).join(',');

        db.run(
          `INSERT INTO group_members (group_id, user_id) VALUES ${memberValues}`,
          function(err) {
            if (err) {
              return res.status(500).json({ message: 'Error adding members' });
            }
            res.json({ id: groupId, name, admin_id: adminId });
          }
        );
      }
    );
  },

  getGroups: async (req, res) => {
    const userId = req.user.userId;

    db.all(
      `SELECT g.* FROM groups g
       INNER JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?`,
      [userId],
      (err, groups) => {
        if (err) {
          return res.status(500).json({ message: 'Error fetching groups' });
        }
        res.json(groups);
      }
    );
  },

  sendGroupMessage: async (req, res) => {
    const { content, messageType = 'text', mediaUrl = null } = req.body;
    const { groupId } = req.params;
    const senderId = req.user.userId;

    db.run(
      'INSERT INTO messages (sender_id, group_id, content, message_type, media_url) VALUES (?, ?, ?, ?, ?)',
      [senderId, groupId, content, messageType, mediaUrl],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Error sending message' });
        }
        res.json({
          id: this.lastID,
          sender_id: senderId,
          group_id: groupId,
          content,
          message_type: messageType,
          media_url: mediaUrl,
          created_at: new Date()
        });
      }
    );
  },

  getGroupMessages: async (req, res) => {
    const { groupId } = req.params;

    db.all(
      'SELECT * FROM messages WHERE group_id = ? ORDER BY created_at ASC',
      [groupId],
      (err, messages) => {
        if (err) {
          return res.status(500).json({ message: 'Error fetching messages' });
        }
        res.json(messages);
      }
    );
  }
};

module.exports = groupController; 