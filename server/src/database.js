const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the database directory exists
const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create a new database connection
const db = new sqlite3.Database(path.join(dbDir, 'database.sqlite'), (err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Connected to SQLite database');
    
    // Create tables if they don't exist
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          online INTEGER DEFAULT 0,
          last_active DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
        } else {
          console.log('Users table ready');
        }
      });

      // Create messages table
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender_id INTEGER NOT NULL,
          receiver_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users (id),
          FOREIGN KEY (receiver_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating messages table:', err);
        } else {
          console.log('Messages table ready');
        }
      });

      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
      db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      db.run('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)');
    });
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

module.exports = { db };