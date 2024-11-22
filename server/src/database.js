const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Enable WAL mode for better concurrent access
const db = new sqlite3.Database(path.join(__dirname, 'chat.db'), (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    db.run('PRAGMA journal_mode = WAL');
    initializeTables();
  }
});

function initializeTables() {
  db.serialize(() => {
    // Create users table with better indexing
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      online BOOLEAN DEFAULT 0,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create index for faster user lookups
    db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    db.run('CREATE INDEX IF NOT EXISTS idx_users_online ON users(online)');

    // Create messages table with proper indexing
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      media_url TEXT,
      read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users (id),
      FOREIGN KEY (recipient_id) REFERENCES users (id)
    )`);

    // Create indexes for faster message queries
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)');

    console.log('Database tables initialized');
  });
}

// Function to reset online status of all users
function resetOnlineStatus() {
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET online = 0', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Function to get all users
function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, username, online FROM users ORDER BY username', [], (err, users) => {
      if (err) reject(err);
      else resolve(users);
    });
  });
}

// Function to update user status
function updateUserStatus(userId, online) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET online = ?, last_active = datetime("now") WHERE id = ?', 
      [online ? 1 : 0, userId], 
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

module.exports = {
  db,
  resetOnlineStatus,
  getAllUsers,
  updateUserStatus
}; 