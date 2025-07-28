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

      // Create users table with privilege system
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT,
          role TEXT DEFAULT 'user',
          privilege_level INTEGER DEFAULT 1,
          department_id INTEGER,
          manager_id INTEGER,
          picture_url TEXT,
          salt TEXT, -- E2EE salt for key derivation
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (department_id) REFERENCES departments (id),
          FOREIGN KEY (manager_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating users table:', err);
          reject(err);
        } else {
          console.log('✅ Users table created/verified');
        }
      });

      // Create departments table
      db.run(`
        CREATE TABLE IF NOT EXISTS departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          manager_id INTEGER,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (manager_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating departments table:', err);
          reject(err);
        } else {
          console.log('✅ Departments table created/verified');
        }
      });

      // Create privilege permissions table
      db.run(`
        CREATE TABLE IF NOT EXISTS privilege_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          privilege_level INTEGER NOT NULL,
          resource_type TEXT NOT NULL,
          action TEXT NOT NULL,
          scope TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(privilege_level, resource_type, action)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating privilege_permissions table:', err);
          reject(err);
        } else {
          console.log('✅ Privilege permissions table created/verified');
        }
      });

      // Create Google service access table
      db.run(`
        CREATE TABLE IF NOT EXISTS google_service_access (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          service_type TEXT NOT NULL,
          access_level TEXT NOT NULL,
          scopes TEXT,
          access_token TEXT,
          refresh_token TEXT,
          expires_at DATETIME,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(user_id, service_type)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating google_service_access table:', err);
          reject(err);
        } else {
          console.log('✅ Google service access table created/verified');
        }
      });

      // Create user permissions table for granular permissions
      db.run(`
        CREATE TABLE IF NOT EXISTS user_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          resource_type TEXT NOT NULL,
          action TEXT NOT NULL,
          scope TEXT NOT NULL,
          granted_by INTEGER,
          granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          is_active BOOLEAN DEFAULT 1,
          
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (granted_by) REFERENCES users (id),
          UNIQUE(user_id, resource_type, action)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating user_permissions table:', err);
          reject(err);
        } else {
          console.log('✅ User permissions table created/verified');
        }
      });

      // Create permission templates table for reusable permission sets
      db.run(`
        CREATE TABLE IF NOT EXISTS permission_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          permissions TEXT NOT NULL, -- JSON array of permissions
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating permission_templates table:', err);
          reject(err);
        } else {
          console.log('✅ Permission templates table created/verified');
        }
      });

      // Create custom privilege levels table
      db.run(`
        CREATE TABLE IF NOT EXISTS custom_privilege_levels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level_number INTEGER UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          permissions TEXT NOT NULL, -- JSON array of permissions
          is_active BOOLEAN DEFAULT 1,
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating custom_privilege_levels table:', err);
          reject(err);
        } else {
          console.log('✅ Custom privilege levels table created/verified');
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
          
          -- Additional fields from staff roster
          date_of_birth TEXT,
          gender TEXT CHECK(gender IN ('M', 'F')),
          nationality TEXT,
          job_description TEXT,
          employment_type TEXT CHECK(employment_type IN ('Full-time', 'Part-time', 'Temporary', 'Consultant')),
          education_qualifications TEXT,
          relevant_experience TEXT,
          
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

      // Create document categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS document_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          color TEXT DEFAULT '#3B82F6',
          icon TEXT DEFAULT 'file-text',
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating document_categories table:', err);
          reject(err);
        } else {
          console.log('✅ Document categories table created/verified');
        }
      });

      // Create documents table (Google-ready architecture)
      db.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          filename TEXT,
          original_filename TEXT,
          file_size INTEGER,
          mime_type TEXT,
          file_path TEXT, -- Local file path (if stored locally)
          google_doc_id TEXT, -- Google Docs ID (if stored in Google)
          google_drive_id TEXT, -- Google Drive ID (if stored in Google Drive)
          storage_type TEXT DEFAULT 'local', -- 'local', 'google_docs', 'google_drive'
          category_id INTEGER,
          department_id INTEGER,
          uploaded_by INTEGER NOT NULL,
          is_encrypted BOOLEAN DEFAULT 1,
          encryption_key_hash TEXT, -- Hash of encryption key
          version INTEGER DEFAULT 1,
          is_latest_version BOOLEAN DEFAULT 1,
          parent_document_id INTEGER, -- For versioning (links to original document)
          status TEXT DEFAULT 'active', -- 'active', 'archived', 'deleted'
          tags TEXT, -- JSON array of tags
          metadata TEXT, -- JSON object for additional metadata
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (category_id) REFERENCES document_categories (id),
          FOREIGN KEY (department_id) REFERENCES departments (id),
          FOREIGN KEY (uploaded_by) REFERENCES users (id),
          FOREIGN KEY (parent_document_id) REFERENCES documents (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating documents table:', err);
          reject(err);
        } else {
          console.log('✅ Documents table created/verified');
        }
      });

      // Create document permissions table
      db.run(`
        CREATE TABLE IF NOT EXISTS document_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          user_id INTEGER,
          department_id INTEGER,
          privilege_level INTEGER,
          permission_type TEXT NOT NULL, -- 'read', 'write', 'admin'
          granted_by INTEGER NOT NULL,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (document_id) REFERENCES documents (id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (department_id) REFERENCES departments (id),
          FOREIGN KEY (granted_by) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating document_permissions table:', err);
          reject(err);
        } else {
          console.log('✅ Document permissions table created/verified');
        }
      });

      // Create document templates table
      db.run(`
        CREATE TABLE IF NOT EXISTS document_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          template_type TEXT NOT NULL, -- 'contract', 'policy', 'form', 'report'
          google_doc_template_id TEXT, -- Google Docs template ID
          local_template_path TEXT, -- Local template file path
          category_id INTEGER,
          is_active BOOLEAN DEFAULT 1,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (category_id) REFERENCES document_categories (id),
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating document_templates table:', err);
          reject(err);
        } else {
          console.log('✅ Document templates table created/verified');
        }
      });

      // Create onboarding templates table
      db.run(`
        CREATE TABLE IF NOT EXISTS onboarding_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          category_id INTEGER,
          is_active BOOLEAN DEFAULT 1,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (category_id) REFERENCES document_categories (id),
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating onboarding_templates table:', err);
          reject(err);
        } else {
          console.log('✅ Onboarding templates table created/verified');
        }
      });

      // Create onboarding checklist table
      db.run(`
        CREATE TABLE IF NOT EXISTS onboarding_checklist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_name TEXT NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'general',
          order_index INTEGER DEFAULT 0,
          default_days INTEGER DEFAULT 7,
          is_required BOOLEAN DEFAULT 1,
          assigned_to INTEGER,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (assigned_to) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating onboarding_checklist table:', err);
          reject(err);
        } else {
          console.log('✅ Onboarding checklist table created/verified');
        }
      });

      // Create onboarding processes table
      db.run(`
        CREATE TABLE IF NOT EXISTS onboarding_processes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT NOT NULL,
          template_id INTEGER,
          assigned_manager_id INTEGER,
          status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'
          start_date DATETIME,
          completed_at DATETIME,
          notes TEXT,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (employee_id) REFERENCES employees (employee_id),
          FOREIGN KEY (template_id) REFERENCES onboarding_templates (id),
          FOREIGN KEY (assigned_manager_id) REFERENCES users (id),
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating onboarding_processes table:', err);
          reject(err);
        } else {
          console.log('✅ Onboarding processes table created/verified');
        }
      });

      // Create onboarding tasks table
      db.run(`
        CREATE TABLE IF NOT EXISTS onboarding_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          process_id INTEGER NOT NULL,
          checklist_item_id INTEGER,
          task_name TEXT NOT NULL,
          description TEXT,
          assigned_to INTEGER,
          due_date DATETIME,
          status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
          completed_at DATETIME,
          notes TEXT,
          order_index INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (process_id) REFERENCES onboarding_processes (id),
          FOREIGN KEY (checklist_item_id) REFERENCES onboarding_checklist (id),
          FOREIGN KEY (assigned_to) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating onboarding_tasks table:', err);
          reject(err);
        } else {
          console.log('✅ Onboarding tasks table created/verified');
        }
      });

      // Create approval workflows table
      db.run(`
        CREATE TABLE IF NOT EXISTS approval_workflows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          resource_type TEXT NOT NULL,
          trigger_conditions TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating approval_workflows table:', err);
          reject(err);
        } else {
          console.log('✅ Approval workflows table created/verified');
        }
      });

      // Create approval steps table
      db.run(`
        CREATE TABLE IF NOT EXISTS approval_steps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workflow_id INTEGER NOT NULL,
          step_order INTEGER NOT NULL,
          approver_type TEXT NOT NULL,
          approver_value TEXT NOT NULL,
          approval_type TEXT NOT NULL,
          timeout_days INTEGER DEFAULT 7,
          is_required BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (workflow_id) REFERENCES approval_workflows (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating approval_steps table:', err);
          reject(err);
        } else {
          console.log('✅ Approval steps table created/verified');
        }
      });

      // Create approval requests table
      db.run(`
        CREATE TABLE IF NOT EXISTS approval_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workflow_id INTEGER NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id INTEGER NOT NULL,
          requester_id INTEGER NOT NULL,
          current_step INTEGER DEFAULT 1,
          status TEXT DEFAULT 'pending',
          priority TEXT DEFAULT 'normal',
          due_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (workflow_id) REFERENCES approval_workflows (id),
          FOREIGN KEY (requester_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating approval_requests table:', err);
          reject(err);
        } else {
          console.log('✅ Approval requests table created/verified');
        }
      });

      // Create approval actions table
      db.run(`
        CREATE TABLE IF NOT EXISTS approval_actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL,
          step_id INTEGER NOT NULL,
          approver_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          comments TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (request_id) REFERENCES approval_requests (id),
          FOREIGN KEY (step_id) REFERENCES approval_steps (id),
          FOREIGN KEY (approver_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating approval_actions table:', err);
          reject(err);
        } else {
          console.log('✅ Approval actions table created/verified');
        }
      });

      // Create approval notifications table
      db.run(`
        CREATE TABLE IF NOT EXISTS approval_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          notification_type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT 0,
          read_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (request_id) REFERENCES approval_requests (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating approval_notifications table:', err);
          reject(err);
        } else {
          console.log('✅ Approval notifications table created/verified');
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
            insertPrivilegePermissions();
          }
        });
      };

      // Insert privilege permissions
      const insertPrivilegePermissions = () => {
        const permissions = [
          // Level 1: View Only
          [1, 'employees', 'read', 'own'],
          [1, 'leave_requests', 'read', 'own'],
          [1, 'profile', 'read', 'own'],
          
          // Level 2: Basic User
          [2, 'employees', 'read', 'own'],
          [2, 'leave_requests', 'read', 'own'],
          [2, 'leave_requests', 'create', 'own'],
          [2, 'profile', 'read', 'own'],
          [2, 'profile', 'update', 'own'],
          [2, 'google_docs', 'read', 'own'],
          [2, 'google_sheets', 'read', 'assigned'],
          [2, 'documents', 'read', 'own'],
          
          // Level 3: Department Manager
          [3, 'employees', 'read', 'department'],
          [3, 'employees', 'update', 'department'],
          [3, 'leave_requests', 'read', 'department'],
          [3, 'leave_requests', 'approve', 'department'],
          [3, 'profile', 'read', 'own'],
          [3, 'profile', 'update', 'own'],
          [3, 'google_docs', 'read', 'own'],
          [3, 'google_docs', 'write', 'own'],
          [3, 'google_sheets', 'read', 'department'],
          [3, 'google_sheets', 'write', 'department'],
          [3, 'google_calendar', 'read', 'department'],
          [3, 'google_calendar', 'write', 'department'],
          [3, 'documents', 'read', 'department'],
          [3, 'documents', 'create', 'department'],
          [3, 'documents', 'update', 'department'],
          
          // Level 4: HR Manager
          [4, 'employees', 'read', 'all'],
          [4, 'employees', 'create', 'all'],
          [4, 'employees', 'update', 'all'],
          [4, 'leave_requests', 'read', 'all'],
          [4, 'leave_requests', 'approve', 'all'],
          [4, 'profile', 'read', 'all'],
          [4, 'profile', 'update', 'all'],
          [4, 'google_docs', 'read', 'all'],
          [4, 'google_docs', 'write', 'all'],
          [4, 'google_sheets', 'read', 'all'],
          [4, 'google_sheets', 'write', 'all'],
          [4, 'google_calendar', 'read', 'all'],
          [4, 'google_calendar', 'write', 'all'],
          [4, 'google_drive', 'read', 'all'],
          [4, 'google_drive', 'write', 'all'],
          [4, 'documents', 'read', 'all'],
          [4, 'documents', 'create', 'all'],
          [4, 'documents', 'update', 'all'],
          [4, 'document_templates', 'read', 'all'],
          [4, 'document_templates', 'create', 'all'],
          
          // Level 5: System Administrator
          [5, 'employees', 'read', 'all'],
          [5, 'employees', 'create', 'all'],
          [5, 'employees', 'update', 'all'],
          [5, 'employees', 'delete', 'all'],
          [5, 'leave_requests', 'read', 'all'],
          [5, 'leave_requests', 'approve', 'all'],
          [5, 'leave_requests', 'delete', 'all'],
          [5, 'profile', 'read', 'all'],
          [5, 'profile', 'update', 'all'],
          [5, 'profile', 'delete', 'all'],
          [5, 'users', 'read', 'all'],
          [5, 'users', 'create', 'all'],
          [5, 'users', 'update', 'all'],
          [5, 'users', 'delete', 'all'],
          [5, 'departments', 'read', 'all'],
          [5, 'departments', 'create', 'all'],
          [5, 'departments', 'update', 'all'],
          [5, 'departments', 'delete', 'all'],
          [5, 'privileges', 'read', 'all'],
          [5, 'privileges', 'create', 'all'],
          [5, 'privileges', 'update', 'all'],
          [5, 'privileges', 'delete', 'all'],
          [5, 'google_docs', 'read', 'all'],
          [5, 'google_docs', 'write', 'all'],
          [5, 'google_sheets', 'read', 'all'],
          [5, 'google_sheets', 'write', 'all'],
          [5, 'google_calendar', 'read', 'all'],
          [5, 'google_calendar', 'write', 'all'],
          [5, 'google_drive', 'read', 'all'],
          [5, 'google_drive', 'write', 'all'],
          [5, 'documents', 'read', 'all'],
          [5, 'documents', 'create', 'all'],
          [5, 'documents', 'update', 'all'],
          [5, 'documents', 'delete', 'all'],
          [5, 'document_templates', 'read', 'all'],
          [5, 'document_templates', 'create', 'all'],
          [5, 'document_templates', 'update', 'all'],
          [5, 'document_templates', 'delete', 'all'],
          [5, 'system', 'admin', 'all']
        ];

        const stmt = db.prepare(`
          INSERT OR IGNORE INTO privilege_permissions (privilege_level, resource_type, action, scope)
          VALUES (?, ?, ?, ?)
        `);

        permissions.forEach(([level, resource, action, scope]) => {
          stmt.run(level, resource, action, scope);
        });

        stmt.finalize((err) => {
          if (err) {
            console.error('❌ Error inserting privilege permissions:', err);
          } else {
            console.log('✅ Privilege permissions inserted');
            insertPermissionTemplates();
          }
        });
      };

      // Insert permission templates
      const insertPermissionTemplates = () => {
        const templates = [
          {
            name: 'Temporary HR Access',
            description: 'Temporary access to HR functions for project work',
            permissions: JSON.stringify([
              { resource_type: 'employees', action: 'read', scope: 'all' },
              { resource_type: 'leave_requests', action: 'read', scope: 'all' },
              { resource_type: 'leave_requests', action: 'approve', scope: 'all' },
              { expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() } // 30 days
            ])
          },
          {
            name: 'Department Supervisor',
            description: 'Department-level management permissions',
            permissions: JSON.stringify([
              { resource_type: 'employees', action: 'read', scope: 'department' },
              { resource_type: 'employees', action: 'update', scope: 'department' },
              { resource_type: 'leave_requests', action: 'read', scope: 'department' },
              { resource_type: 'leave_requests', action: 'approve', scope: 'department' }
            ])
          },
          {
            name: 'Google Integration Access',
            description: 'Access to Google services for specific users',
            permissions: JSON.stringify([
              { resource_type: 'google_docs', action: 'read', scope: 'all' },
              { resource_type: 'google_docs', action: 'write', scope: 'all' },
              { resource_type: 'google_sheets', action: 'read', scope: 'all' },
              { resource_type: 'google_sheets', action: 'write', scope: 'all' },
              { resource_type: 'google_calendar', action: 'read', scope: 'all' },
              { resource_type: 'google_calendar', action: 'write', scope: 'all' }
            ])
          },
          {
            name: 'Audit Access',
            description: 'Read-only access for audit purposes',
            permissions: JSON.stringify([
              { resource_type: 'employees', action: 'read', scope: 'all' },
              { resource_type: 'leave_requests', action: 'read', scope: 'all' },
              { resource_type: 'audit_log', action: 'read', scope: 'all' }
            ])
          }
        ];

        const stmt = db.prepare(`
          INSERT OR IGNORE INTO permission_templates (name, description, permissions)
          VALUES (?, ?, ?)
        `);

        templates.forEach(template => {
          stmt.run(template.name, template.description, template.permissions);
        });

        stmt.finalize((err) => {
          if (err) {
            console.error('❌ Error inserting permission templates:', err);
          } else {
            console.log('✅ Permission templates inserted');
            insertCustomPrivilegeLevels();
          }
        });
      };

      // Insert custom privilege levels
      const insertCustomPrivilegeLevels = () => {
        const customLevels = [
          {
            level_number: 6,
            name: 'Senior HR Specialist',
            description: 'Advanced HR functions with limited system access',
            permissions: JSON.stringify([
              { resource_type: 'employees', action: 'read', scope: 'all' },
              { resource_type: 'employees', action: 'create', scope: 'all' },
              { resource_type: 'employees', action: 'update', scope: 'all' },
              { resource_type: 'leave_requests', action: 'read', scope: 'all' },
              { resource_type: 'leave_requests', action: 'approve', scope: 'all' },
              { resource_type: 'google_docs', action: 'read', scope: 'all' },
              { resource_type: 'google_docs', action: 'write', scope: 'all' },
              { resource_type: 'google_sheets', action: 'read', scope: 'all' },
              { resource_type: 'google_sheets', action: 'write', scope: 'all' },
              { resource_type: 'google_calendar', action: 'read', scope: 'all' },
              { resource_type: 'google_calendar', action: 'write', scope: 'all' },
              { resource_type: 'google_drive', action: 'read', scope: 'all' },
              { resource_type: 'google_drive', action: 'write', scope: 'all' }
            ])
          },
          {
            level_number: 7,
            name: 'Finance Manager',
            description: 'Financial data access with employee management',
            permissions: JSON.stringify([
              { resource_type: 'employees', action: 'read', scope: 'all' },
              { resource_type: 'employees', action: 'update', scope: 'all' },
              { resource_type: 'leave_requests', action: 'read', scope: 'all' },
              { resource_type: 'leave_requests', action: 'approve', scope: 'all' },
              { resource_type: 'google_sheets', action: 'read', scope: 'all' },
              { resource_type: 'google_sheets', action: 'write', scope: 'all' },
              { resource_type: 'google_docs', action: 'read', scope: 'all' },
              { resource_type: 'audit_log', action: 'read', scope: 'all' }
            ])
          },
          {
            level_number: 8,
            name: 'IT Administrator',
            description: 'System administration without HR data access',
            permissions: JSON.stringify([
              { resource_type: 'users', action: 'read', scope: 'all' },
              { resource_type: 'users', action: 'create', scope: 'all' },
              { resource_type: 'users', action: 'update', scope: 'all' },
              { resource_type: 'users', action: 'delete', scope: 'all' },
              { resource_type: 'departments', action: 'read', scope: 'all' },
              { resource_type: 'departments', action: 'create', scope: 'all' },
              { resource_type: 'departments', action: 'update', scope: 'all' },
              { resource_type: 'departments', action: 'delete', scope: 'all' },
              { resource_type: 'privileges', action: 'read', scope: 'all' },
              { resource_type: 'privileges', action: 'create', scope: 'all' },
              { resource_type: 'privileges', action: 'update', scope: 'all' },
              { resource_type: 'privileges', action: 'delete', scope: 'all' },
              { resource_type: 'system', action: 'admin', scope: 'all' }
            ])
          },
          {
            level_number: 9,
            name: 'Compliance Officer',
            description: 'Read-only access for compliance and audit purposes',
            permissions: JSON.stringify([
              { resource_type: 'employees', action: 'read', scope: 'all' },
              { resource_type: 'leave_requests', action: 'read', scope: 'all' },
              { resource_type: 'audit_log', action: 'read', scope: 'all' },
              { resource_type: 'google_docs', action: 'read', scope: 'all' },
              { resource_type: 'google_sheets', action: 'read', scope: 'all' }
            ])
          },
          {
            level_number: 10,
            name: 'Project Manager',
            description: 'Project management with team access',
            permissions: JSON.stringify([
              { resource_type: 'employees', action: 'read', scope: 'department' },
              { resource_type: 'employees', action: 'update', scope: 'department' },
              { resource_type: 'leave_requests', action: 'read', scope: 'department' },
              { resource_type: 'leave_requests', action: 'approve', scope: 'department' },
              { resource_type: 'google_calendar', action: 'read', scope: 'all' },
              { resource_type: 'google_calendar', action: 'write', scope: 'all' },
              { resource_type: 'google_docs', action: 'read', scope: 'all' },
              { resource_type: 'google_docs', action: 'write', scope: 'all' },
              { resource_type: 'google_sheets', action: 'read', scope: 'all' },
              { resource_type: 'google_sheets', action: 'write', scope: 'all' }
            ])
          }
        ];

        const stmt = db.prepare(`
          INSERT OR IGNORE INTO custom_privilege_levels (level_number, name, description, permissions)
          VALUES (?, ?, ?, ?)
        `);

        customLevels.forEach(level => {
          stmt.run(level.level_number, level.name, level.description, level.permissions);
        });

        stmt.finalize((err) => {
          if (err) {
            console.error('❌ Error inserting custom privilege levels:', err);
          } else {
            console.log('✅ Custom privilege levels inserted');
            insertDocumentCategories();
          }
        });
      };

      // Insert default document categories
      const insertDocumentCategories = () => {
        const categories = [
          {
            name: 'Contracts',
            description: 'Employment contracts, agreements, and legal documents',
            color: '#EF4444',
            icon: 'file-text'
          },
          {
            name: 'Policies',
            description: 'Company policies, procedures, and guidelines',
            color: '#3B82F6',
            icon: 'shield'
          },
          {
            name: 'Certificates',
            description: 'Training certificates, qualifications, and licenses',
            color: '#10B981',
            icon: 'award'
          },
          {
            name: 'Forms',
            description: 'HR forms, applications, and templates',
            color: '#F59E0B',
            icon: 'clipboard-list'
          },
          {
            name: 'Reports',
            description: 'HR reports, analytics, and performance reviews',
            color: '#8B5CF6',
            icon: 'bar-chart'
          },
          {
            name: 'Training',
            description: 'Training materials, courses, and educational content',
            color: '#06B6D4',
            icon: 'graduation-cap'
          },
          {
            name: 'Benefits',
            description: 'Benefits documentation, insurance, and compensation',
            color: '#84CC16',
            icon: 'heart'
          },
          {
            name: 'General',
            description: 'General documents and miscellaneous files',
            color: '#6B7280',
            icon: 'file'
          }
        ];

        const stmt = db.prepare(`
          INSERT OR IGNORE INTO document_categories (name, description, color, icon)
          VALUES (?, ?, ?, ?)
        `);

        categories.forEach(category => {
          stmt.run(category.name, category.description, category.color, category.icon);
        });

        stmt.finalize((err) => {
          if (err) {
            console.error('❌ Error inserting document categories:', err);
          } else {
            console.log('✅ Document categories inserted');
            insertApprovalWorkflows();
          }
        });
      };

      // Insert default onboarding checklist
      const insertOnboardingChecklist = () => {
        const checklist = [
          {
            task_name: 'Employment Contract',
            description: 'Sign and return employment contract',
            category: 'legal',
            order_index: 1,
            default_days: 1,
            is_required: 1
          },
          {
            task_name: 'Employee Handbook',
            description: 'Review and acknowledge employee handbook',
            category: 'policies',
            order_index: 2,
            default_days: 3,
            is_required: 1
          },
          {
            task_name: 'Tax Forms',
            description: 'Complete W-4 and other tax forms',
            category: 'legal',
            order_index: 3,
            default_days: 1,
            is_required: 1
          },
          {
            task_name: 'Direct Deposit Setup',
            description: 'Provide bank account information for direct deposit',
            category: 'payroll',
            order_index: 4,
            default_days: 2,
            is_required: 1
          },
          {
            task_name: 'Benefits Enrollment',
            description: 'Enroll in health insurance and other benefits',
            category: 'benefits',
            order_index: 5,
            default_days: 7,
            is_required: 1
          },
          {
            task_name: 'IT Account Setup',
            description: 'Set up email, computer access, and software accounts',
            category: 'it',
            order_index: 6,
            default_days: 2,
            is_required: 1
          },
          {
            task_name: 'Security Training',
            description: 'Complete mandatory security and compliance training',
            category: 'training',
            order_index: 7,
            default_days: 5,
            is_required: 1
          },
          {
            task_name: 'Department Orientation',
            description: 'Meet with department manager and team members',
            category: 'general',
            order_index: 8,
            default_days: 3,
            is_required: 1
          },
          {
            task_name: 'Equipment Setup',
            description: 'Receive and set up work equipment (computer, phone, etc.)',
            category: 'it',
            order_index: 9,
            default_days: 2,
            is_required: 1
          },
          {
            task_name: 'Emergency Contacts',
            description: 'Provide emergency contact information',
            category: 'hr',
            order_index: 10,
            default_days: 1,
            is_required: 1
          },
          {
            task_name: 'Background Check',
            description: 'Complete background check and drug screening',
            category: 'legal',
            order_index: 11,
            default_days: 10,
            is_required: 1
          },
          {
            task_name: 'First Day Welcome',
            description: 'Attend first day welcome session and company overview',
            category: 'general',
            order_index: 12,
            default_days: 1,
            is_required: 1
          }
        ];

        const stmt = db.prepare(`
          INSERT OR IGNORE INTO onboarding_checklist (task_name, description, category, order_index, default_days, is_required)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        checklist.forEach(item => {
          stmt.run(item.task_name, item.description, item.category, item.order_index, item.default_days, item.is_required);
        });

        stmt.finalize((err) => {
          if (err) {
            console.error('❌ Error inserting onboarding checklist:', err);
          } else {
            console.log('✅ Onboarding checklist inserted');
            insertApprovalWorkflows();
          }
        });
      };

      // Insert default approval workflows
      const insertApprovalWorkflows = () => {
        const workflows = [
          {
            name: 'Leave Request - Standard',
            description: 'Standard leave request approval workflow',
            resource_type: 'leave',
            trigger_conditions: JSON.stringify({
              leave_type: ['annual', 'sick', 'personal'],
              days_requested: { max: 5 }
            })
          },
          {
            name: 'Leave Request - Extended',
            description: 'Extended leave request approval workflow',
            resource_type: 'leave',
            trigger_conditions: JSON.stringify({
              leave_type: ['annual', 'sick', 'personal'],
              days_requested: { min: 6, max: 14 }
            })
          },
          {
            name: 'Leave Request - Long Term',
            description: 'Long-term leave request approval workflow',
            resource_type: 'leave',
            trigger_conditions: JSON.stringify({
              leave_type: ['annual', 'sick', 'personal'],
              days_requested: { min: 15 }
            })
          },
          {
            name: 'Document Approval - Standard',
            description: 'Standard document approval workflow',
            resource_type: 'document',
            trigger_conditions: JSON.stringify({
              category: ['policies', 'contracts', 'reports']
            })
          },
          {
            name: 'Employee Change - Standard',
            description: 'Standard employee change approval workflow',
            resource_type: 'employee',
            trigger_conditions: JSON.stringify({
              change_type: ['position', 'department', 'salary']
            })
          }
        ];

        const stmt = db.prepare(`
          INSERT OR IGNORE INTO approval_workflows (name, description, resource_type, trigger_conditions)
          VALUES (?, ?, ?, ?)
        `);

        workflows.forEach(workflow => {
          stmt.run(workflow.name, workflow.description, workflow.resource_type, workflow.trigger_conditions);
        });

        stmt.finalize((err) => {
          if (err) {
            console.error('❌ Error inserting approval workflows:', err);
          } else {
            console.log('✅ Approval workflows inserted');
            insertApprovalSteps();
          }
        });
      };

      // Insert default approval steps
      const insertApprovalSteps = () => {
        // Get workflow IDs first
        db.all('SELECT id, name FROM approval_workflows', [], (err, workflows) => {
          if (err) {
            console.error('❌ Error fetching workflows:', err);
            createDefaultAdmin();
            return;
          }

          const workflowMap = {};
          workflows.forEach(w => workflowMap[w.name] = w.id);

          const steps = [
            // Leave Request - Standard (Manager only)
            {
              workflow_id: workflowMap['Leave Request - Standard'],
              step_order: 1,
              approver_type: 'manager',
              approver_value: 'direct',
              approval_type: 'any',
              timeout_days: 3
            },
            // Leave Request - Extended (Manager + Department Head)
            {
              workflow_id: workflowMap['Leave Request - Extended'],
              step_order: 1,
              approver_type: 'manager',
              approver_value: 'direct',
              approval_type: 'any',
              timeout_days: 3
            },
            {
              workflow_id: workflowMap['Leave Request - Extended'],
              step_order: 2,
              approver_type: 'role',
              approver_value: 'department_head',
              approval_type: 'any',
              timeout_days: 5
            },
            // Leave Request - Long Term (Manager + Department Head + HR)
            {
              workflow_id: workflowMap['Leave Request - Long Term'],
              step_order: 1,
              approver_type: 'manager',
              approver_value: 'direct',
              approval_type: 'any',
              timeout_days: 3
            },
            {
              workflow_id: workflowMap['Leave Request - Long Term'],
              step_order: 2,
              approver_type: 'role',
              approver_value: 'department_head',
              approval_type: 'any',
              timeout_days: 5
            },
            {
              workflow_id: workflowMap['Leave Request - Long Term'],
              step_order: 3,
              approver_type: 'role',
              approver_value: 'hr_manager',
              approval_type: 'any',
              timeout_days: 7
            },
            // Document Approval - Standard (Department Head + HR)
            {
              workflow_id: workflowMap['Document Approval - Standard'],
              step_order: 1,
              approver_type: 'role',
              approver_value: 'department_head',
              approval_type: 'any',
              timeout_days: 5
            },
            {
              workflow_id: workflowMap['Document Approval - Standard'],
              step_order: 2,
              approver_type: 'role',
              approver_value: 'hr_manager',
              approval_type: 'any',
              timeout_days: 7
            },
            // Employee Change - Standard (Manager + HR + Finance)
            {
              workflow_id: workflowMap['Employee Change - Standard'],
              step_order: 1,
              approver_type: 'manager',
              approver_value: 'direct',
              approval_type: 'any',
              timeout_days: 3
            },
            {
              workflow_id: workflowMap['Employee Change - Standard'],
              step_order: 2,
              approver_type: 'role',
              approver_value: 'hr_manager',
              approval_type: 'any',
              timeout_days: 5
            },
            {
              workflow_id: workflowMap['Employee Change - Standard'],
              step_order: 3,
              approver_type: 'role',
              approver_value: 'finance_manager',
              approval_type: 'any',
              timeout_days: 5
            }
          ];

          const stmt = db.prepare(`
            INSERT OR IGNORE INTO approval_steps (workflow_id, step_order, approver_type, approver_value, approval_type, timeout_days)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          steps.forEach(step => {
            if (step.workflow_id) {
              stmt.run(step.workflow_id, step.step_order, step.approver_type, step.approver_value, step.approval_type, step.timeout_days);
            }
          });

          stmt.finalize((err) => {
            if (err) {
              console.error('❌ Error inserting approval steps:', err);
            } else {
              console.log('✅ Approval steps inserted');
            }
            createDefaultAdmin();
          });
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
                `INSERT INTO users (username, email, password_hash, name, role, privilege_level, salt, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [adminUsername, adminEmail, passwordHash, 'System Administrator', 'admin', 5, e2eeSalt, 1],
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