const db = require('../database').db;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userController = {
  getUsers: async (req, res) => {
    try {
      // Get ALL registered users with their online status
      db.all(
        `SELECT id, username, online, last_active 
         FROM users 
         WHERE id != ?
         ORDER BY username ASC`,
        [req.user.userId],
        (err, users) => {
          if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ message: 'Error fetching users' });
          }
          
          console.log('Sending all registered users:', users);
          res.json(users);
        }
      );
    } catch (err) {
      console.error('Server error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  login: async (req, res) => {
    console.log('Login attempt:', { username: req.body.username });
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
      // Find user by username
      db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Server error' });
        }
        
        if (!user) {
          return res.status(400).json({ message: 'User not found' });
        }

        try {
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password' });
          }

          // Update user's online status
          db.run('UPDATE users SET online = ?, last_active = datetime("now") WHERE id = ?', [1, user.id], async (err) => {
            if (err) {
              console.error('Error updating user status:', err);
            }

            const token = jwt.sign(
              { userId: user.id },
              process.env.JWT_SECRET || 'your_jwt_secret',
              { expiresIn: '24h' }
            );

            console.log('User logged in successfully:', { username: user.username });

            // Notify other users
            if (global.io) {
              global.io.emit('userOnline', { 
                userId: user.id, 
                username: user.username 
              });
            }

            res.json({
              token,
              user: {
                id: user.id,
                username: user.username,
                email: user.email,
                online: true
              }
            });
          });
        } catch (compareError) {
          console.error('Password comparison error:', compareError);
          return res.status(500).json({ message: 'Error verifying password' });
        }
      });
    } catch (err) {
      console.error('Server error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  register: async (req, res) => {
    console.log('Registration attempt:', req.body);
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      // Check if user exists
      db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], async (err, existingUser) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Server error' });
        }
        if (existingUser) {
          return res.status(400).json({ 
            message: existingUser.username === username ? 'Username already taken' : 'Email already registered' 
          });
        }

        try {
          // Hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);

          // Create user
          db.run(
            'INSERT INTO users (username, email, password, online, last_active) VALUES (?, ?, ?, ?, datetime("now"))',
            [username, email, hashedPassword, 1],
            function(err) {
              if (err) {
                console.error('Error creating user:', err);
                return res.status(500).json({ message: 'Error creating user' });
              }

              const token = jwt.sign(
                { userId: this.lastID },
                process.env.JWT_SECRET || 'your_jwt_secret',
                { expiresIn: '24h' }
              );

              const newUser = {
                id: this.lastID,
                username,
                email,
                online: true
              };

              console.log('User created successfully:', newUser);

              // Broadcast new user to all clients
              if (global.io) {
                global.io.emit('newUserRegistered', newUser);
                global.io.emit('userOnline', { 
                  userId: this.lastID, 
                  username 
                });
              }

              res.status(201).json({
                token,
                user: newUser
              });
            }
          );
        } catch (hashError) {
          console.error('Password hashing error:', hashError);
          return res.status(500).json({ message: 'Error processing password' });
        }
      });
    } catch (err) {
      console.error('Server error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  logout: async (req, res) => {
    try {
      db.run('UPDATE users SET online = 0, last_active = datetime("now") WHERE id = ?', [req.user.userId], (err) => {
        if (err) {
          console.error('Error updating user status:', err);
          return res.status(500).json({ message: 'Error logging out' });
        }

        if (global.io) {
          global.io.emit('userOffline', { userId: req.user.userId });
        }

        res.json({ message: 'Logged out successfully' });
      });
    } catch (err) {
      console.error('Server error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getUser: async (req, res) => {
    try {
      db.get('SELECT id, username, email, online FROM users WHERE id = ?', [req.user.userId], (err, user) => {
        if (err) {
          console.error('Error fetching user:', err);
          return res.status(500).json({ message: 'Error fetching user data' });
        }
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
      });
    } catch (err) {
      console.error('Server error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  searchUsers: async (req, res) => {
    const { query } = req.query;
    try {
      db.all(
        `SELECT id, username, online, last_active 
         FROM users 
         WHERE id != ? AND username LIKE ?
         ORDER BY username ASC`,
        [req.user.userId, `%${query}%`],
        (err, users) => {
          if (err) {
            console.error('Error searching users:', err);
            return res.status(500).json({ message: 'Error searching users' });
          }
          res.json(users);
        }
      );
    } catch (err) {
      console.error('Server error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = userController;