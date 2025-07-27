const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Database file path
const dbPath = path.join(__dirname, 'mohr_hr_v2.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Connected to MOHR HR V2 SQLite database');
  }
});

// Initialize database tables
const initDatabase = async () => {
  try {
    // Enable foreign keys
    await runQuery('PRAGMA foreign_keys = ON');
    
    // Users table with Google integration
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        google_id VARCHAR(100) UNIQUE,
        name VARCHAR(100),
        picture_url TEXT,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Employees table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        position VARCHAR(100),
        department VARCHAR(100),
        hire_date DATE,
        salary DECIMAL(10,2),
        manager_id INTEGER,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES employees (id)
      )
    `);
    
    // Leave requests table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days_requested INTEGER NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by INTEGER,
        approved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id),
        FOREIGN KEY (approved_by) REFERENCES users (id)
      )
    `);
    
    // Google Calendar integration table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS google_calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_event_id VARCHAR(100) UNIQUE,
        employee_id INTEGER NOT NULL,
        event_title VARCHAR(200) NOT NULL,
        event_description TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        calendar_id VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id)
      )
    `);
    
    // Create default admin user if not exists
    await createDefaultAdmin();
    
    console.log('✅ Database tables initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

// Helper function to run queries
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

// Helper function to get single row
const getRow = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Helper function to get multiple rows
const getAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Create default admin user
const createDefaultAdmin = async () => {
  try {
    // Check if admin user exists
    const adminUser = await getRow('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await runQuery(`
        INSERT INTO users (username, email, password_hash, name, role)
        VALUES (?, ?, ?, ?, ?)
      `, ['admin', 'admin@mohr.com', hashedPassword, 'System Administrator', 'admin']);
      
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
  }
};

// Export database instance and functions
module.exports = {
  db,
  runQuery,
  getRow,
  getAll,
  initDatabase
};

// Initialize database when this module is loaded
initDatabase(); 