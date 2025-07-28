const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '../database/mohr_hr_v2.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

const migrateAgeToDateOfBirth = () => {
  return new Promise((resolve, reject) => {
    console.log('🔄 Starting migration: Age to Date of Birth...');
    
    db.serialize(() => {
      // First, add the date_of_birth column if it doesn't exist
      db.run(`
        ALTER TABLE employees ADD COLUMN date_of_birth TEXT
      `, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Error adding date_of_birth column:', err);
          reject(err);
          return;
        }
        console.log('✅ Added date_of_birth column');
      });

      // Get all employees with age data
      db.all(`
        SELECT id, age, hire_date 
        FROM employees 
        WHERE age IS NOT NULL AND age > 0
      `, [], (err, rows) => {
        if (err) {
          console.error('❌ Error fetching employees with age:', err);
          reject(err);
          return;
        }

        console.log(`📊 Found ${rows.length} employees with age data to migrate`);

        if (rows.length === 0) {
          console.log('✅ No age data to migrate');
          resolve();
          return;
        }

        // For each employee, estimate date of birth based on age and hire date
        let completed = 0;
        rows.forEach(row => {
          try {
            // Estimate date of birth based on age and hire date
            // We'll assume they were hired around age 25-30 for estimation
            const hireDate = new Date(row.hire_date);
            const estimatedBirthYear = hireDate.getFullYear() - row.age - 25; // Assume hired at age 25
            
            // Create a reasonable date of birth (January 1st of estimated year)
            const dateOfBirth = `${estimatedBirthYear}-01-01`;
            
            // Update the employee record
            db.run(`
              UPDATE employees 
              SET date_of_birth = ? 
              WHERE id = ?
            `, [dateOfBirth, row.id], (err) => {
              if (err) {
                console.error(`❌ Error updating employee ${row.id}:`, err);
              } else {
                completed++;
                console.log(`✅ Updated employee ${row.id}: age ${row.age} → DOB ${dateOfBirth}`);
              }
              
              if (completed === rows.length) {
                console.log(`✅ Migration completed: ${completed} employees updated`);
                resolve();
              }
            });
          } catch (error) {
            console.error(`❌ Error processing employee ${row.id}:`, error);
            completed++;
            if (completed === rows.length) {
              resolve();
            }
          }
        });
      });
    });
  });
};

const removeAgeColumn = () => {
  return new Promise((resolve, reject) => {
    console.log('🔄 Removing age column...');
    
    // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
    // This is a simplified approach - in production, you'd want a more robust migration
    
    db.run(`
      CREATE TABLE employees_new (
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
        console.error('❌ Error creating new employees table:', err);
        reject(err);
        return;
      }
      
      console.log('✅ Created new employees table structure');
      
      // Copy data from old table to new table
      db.run(`
        INSERT INTO employees_new 
        SELECT 
          id, employee_id, salary_encrypted, ssn_encrypted, address_encrypted, 
          phone_encrypted, performance_review_encrypted, first_name_encrypted, 
          last_name_encrypted, email_encrypted, position, department, hire_date, 
          manager_id, is_active, date_of_birth, gender, nationality, job_description, 
          employment_type, education_qualifications, relevant_experience, 
          created_at, updated_at
        FROM employees
      `, (err) => {
        if (err) {
          console.error('❌ Error copying data to new table:', err);
          reject(err);
          return;
        }
        
        console.log('✅ Copied data to new table');
        
        // Drop old table and rename new table
        db.run('DROP TABLE employees', (err) => {
          if (err) {
            console.error('❌ Error dropping old table:', err);
            reject(err);
            return;
          }
          
          db.run('ALTER TABLE employees_new RENAME TO employees', (err) => {
            if (err) {
              console.error('❌ Error renaming table:', err);
              reject(err);
              return;
            }
            
            console.log('✅ Successfully removed age column');
            resolve();
          });
        });
      });
    });
  });
};

// Run the migration
const runMigration = async () => {
  try {
    await migrateAgeToDateOfBirth();
    await removeAgeColumn();
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    db.close();
  }
};

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { migrateAgeToDateOfBirth, removeAgeColumn }; 