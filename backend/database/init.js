const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'mohr_hr_v2.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('✅ Connected to MOHR HR V2 SQLite database');

      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT,
          role TEXT DEFAULT 'user',
          picture_url TEXT,
          salt TEXT, -- E2EE salt for key derivation
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating users table:', err);
          reject(err);
        } else {
          console.log('✅ Users table created/verified');
        }
      });

      // Create employees table with E2EE support
      db.run(`
        CREATE TABLE IF NOT EXISTS employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT UNIQUE NOT NULL,
          
          -- Encrypted fields (Level 1 - Critical)
          salary_encrypted TEXT,
          ssn_encrypted TEXT,
          address_encrypted TEXT,
          phone_encrypted TEXT,
          performance_review_encrypted TEXT,
          
          -- Encrypted fields (Level 2 - Sensitive)
          first_name_encrypted TEXT,
          last_name_encrypted TEXT,
          email_encrypted TEXT,
          
          -- Unencrypted fields (Level 3 - Public)
          position TEXT,
          department TEXT,
          hire_date TEXT,
          manager_id INTEGER,
          is_active BOOLEAN DEFAULT 1,
          
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (manager_id) REFERENCES employees (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating employees table:', err);
          reject(err);
        } else {
          console.log('✅ Employees table created/verified');
        }
      });

      // Create leave requests table with E2EE support
      db.run(`
        CREATE TABLE IF NOT EXISTS leave_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT NOT NULL,
          
          -- Encrypted fields (Critical)
          reason_encrypted TEXT,
          medical_notes_encrypted TEXT,
          
          -- Unencrypted fields (Operational)
          leave_type TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          days_requested INTEGER NOT NULL,
          status TEXT DEFAULT 'pending',
          approved_by INTEGER,
          approved_at DATETIME,
          
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (employee_id) REFERENCES employees (employee_id),
          FOREIGN KEY (approved_by) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating leave_requests table:', err);
          reject(err);
        } else {
          console.log('✅ Leave requests table created/verified');
        }
      });

      // Create audit log table for E2EE operations
      db.run(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id INTEGER,
          field_name TEXT,
          old_value TEXT,
          new_value TEXT,
          ip_address TEXT,
          user_agent TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating audit_log table:', err);
          reject(err);
        } else {
          console.log('✅ Audit log table created/verified');
        }
      });

      // Create encryption metadata table
      db.run(`
        CREATE TABLE IF NOT EXISTS encryption_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          field_name TEXT NOT NULL,
          encryption_level TEXT NOT NULL, -- 'critical', 'sensitive', 'public'
          algorithm TEXT DEFAULT 'AES-GCM',
          key_version INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(table_name, field_name)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating encryption_metadata table:', err);
          reject(err);
        } else {
          console.log('✅ Encryption metadata table created/verified');
          insertEncryptionMetadata();
        }
      });

      // Insert encryption metadata
      const insertEncryptionMetadata = () => {
        const metadata = [
          // Employees table
          ['employees', 'salary_encrypted', 'critical'],
          ['employees', 'ssn_encrypted', 'critical'],
          ['employees', 'address_encrypted', 'critical'],
          ['employees', 'phone_encrypted', 'critical'],
          ['employees', 'performance_review_encrypted', 'critical'],
          ['employees', 'first_name_encrypted', 'sensitive'],
          ['employees', 'last_name_encrypted', 'sensitive'],
          ['employees', 'email_encrypted', 'sensitive'],
          ['employees', 'position', 'public'],
          ['employees', 'department', 'public'],
          ['employees', 'hire_date', 'public'],
          
          // Leave requests table
          ['leave_requests', 'reason_encrypted', 'critical'],
          ['leave_requests', 'medical_notes_encrypted', 'critical'],
          ['leave_requests', 'leave_type', 'public'],
          ['leave_requests', 'start_date', 'public'],
          ['leave_requests', 'end_date', 'public'],
          ['leave_requests', 'days_requested', 'public'],
          ['leave_requests', 'status', 'public']
        ];

        const stmt = db.prepare(`
          INSERT OR IGNORE INTO encryption_metadata (table_name, field_name, encryption_level)
          VALUES (?, ?, ?)
        `);

        metadata.forEach(([table, field, level]) => {
          stmt.run(table, field, level);
        });

        stmt.finalize((err) => {
          if (err) {
            console.error('❌ Error inserting encryption metadata:', err);
          } else {
            console.log('✅ Encryption metadata inserted');
          }
        });
      };

      // Create default admin user with E2EE salt
      const createDefaultAdmin = () => {
        const adminUsername = 'admin';
        const adminEmail = 'admin@mohr.com';
        const adminPassword = 'admin123';
        
        // Generate E2EE salt for admin user
        const crypto = require('crypto');
        const e2eeSalt = crypto.randomBytes(32).toString('base64');
        
        // Hash password
        const passwordHash = bcrypt.hashSync(adminPassword, 10);
        
        db.get(
          'SELECT * FROM users WHERE username = ? OR email = ?',
          [adminUsername, adminEmail],
          (err, row) => {
            if (err) {
              console.error('❌ Error checking admin user:', err);
              // Don't reject here, just log and continue
              console.log('⚠️ Continuing despite admin check error...');
              resolve();
            } else if (!row) {
              // Create admin user
              db.run(
                `INSERT INTO users (username, email, password_hash, name, role, salt, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [adminUsername, adminEmail, passwordHash, 'System Administrator', 'admin', e2eeSalt, 1],
                (err) => {
                  if (err) {
                    console.error('❌ Error creating admin user:', err);
                    // Don't reject here, just log and continue
                    console.log('⚠️ Continuing despite admin creation error...');
                    resolve();
                  } else {
                    console.log('✅ Default admin user created');
                    console.log(`   Username: ${adminUsername}`);
                    console.log(`   Password: ${adminPassword}`);
                    console.log(`   E2EE Salt: ${e2eeSalt}`);
                    resolve();
                  }
                }
              );
            } else {
              console.log('✅ Default admin user already exists');
              resolve();
            }
          }
        );
      };

      // Wait for all tables to be created, then create admin user
      db.run('SELECT 1', (err) => {
        if (err) {
          reject(err);
        } else {
          createDefaultAdmin();
        }
      });
    });
  });
};

// Helper function to get a row from the database
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

// Helper function to get multiple rows from the database
const getRows = (sql, params = []) => {
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

// Helper function to run a query
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// Initialize database when module is loaded
initDatabase()
  .then(() => {
    console.log('✅ Database tables initialized successfully');
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
  });

module.exports = {
  db,
  initDatabase,
  getRow,
  getRows,
  runQuery
}; 