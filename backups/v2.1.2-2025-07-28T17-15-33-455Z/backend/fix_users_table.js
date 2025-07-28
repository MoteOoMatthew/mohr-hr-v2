const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, 'database', 'mohr_hr_v2.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing Users Table Schema\n');

// Add missing columns to users table
const addColumns = () => {
  return new Promise((resolve, reject) => {
    const columns = [
      'privilege_level INTEGER DEFAULT 1',
      'department_id INTEGER',
      'manager_id INTEGER'
    ];

    let completed = 0;
    const total = columns.length;

    columns.forEach(column => {
      const [columnName] = column.split(' ');
      
      // Check if column exists
      db.get(`PRAGMA table_info(users)`, (err, rows) => {
        if (err) {
          console.error(`❌ Error checking column ${columnName}:`, err);
          completed++;
          if (completed === total) resolve();
          return;
        }

        // Check if column exists
        db.all(`PRAGMA table_info(users)`, (err, tableInfo) => {
          if (err) {
            console.error(`❌ Error getting table info:`, err);
            completed++;
            if (completed === total) resolve();
            return;
          }

          const columnExists = tableInfo.some(col => col.name === columnName);
          
          if (!columnExists) {
            console.log(`➕ Adding column: ${columnName}`);
            db.run(`ALTER TABLE users ADD COLUMN ${column}`, (err) => {
              if (err) {
                console.error(`❌ Error adding column ${columnName}:`, err);
              } else {
                console.log(`✅ Added column: ${columnName}`);
              }
              completed++;
              if (completed === total) resolve();
            });
          } else {
            console.log(`✅ Column already exists: ${columnName}`);
            completed++;
            if (completed === total) resolve();
          }
        });
      });
    });
  });
};

// Update admin user privilege level
const updateAdminUser = () => {
  return new Promise((resolve, reject) => {
    console.log('\n👤 Updating admin user privilege level...');
    
    db.run(`UPDATE users SET privilege_level = 5 WHERE email = 'admin@mohr.com'`, (err) => {
      if (err) {
        console.error('❌ Error updating admin user:', err);
        reject(err);
      } else {
        console.log('✅ Admin user updated to privilege level 5');
        resolve();
      }
    });
  });
};

// Test the fix
const testFix = () => {
  return new Promise((resolve, reject) => {
    console.log('\n🧪 Testing the fix...');
    
    db.get("SELECT * FROM users WHERE email = 'admin@mohr.com'", (err, user) => {
      if (err) {
        console.error('❌ Error testing admin user:', err);
        reject(err);
        return;
      }
      
      if (user) {
        console.log('✅ Admin user record:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Privilege Level: ${user.privilege_level}`);
        console.log(`   Department ID: ${user.department_id}`);
        console.log(`   Manager ID: ${user.manager_id}`);
        
        // Test the getUserContext query
        db.get(`
          SELECT u.id, u.privilege_level, u.department_id, u.manager_id,
                 d.name as department_name, d.manager_id as dept_manager_id
          FROM users u
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.id = ?
        `, [user.id], (err, context) => {
          if (err) {
            console.error('❌ Error testing user context:', err);
            reject(err);
            return;
          }
          
          if (context) {
            console.log('\n✅ User context query successful:');
            console.log(`   ID: ${context.id}`);
            console.log(`   Privilege Level: ${context.privilege_level}`);
            console.log(`   Department ID: ${context.department_id}`);
            console.log(`   Manager ID: ${context.manager_id}`);
            console.log(`   Department Name: ${context.department_name}`);
            console.log(`   Dept Manager ID: ${context.dept_manager_id}`);
            resolve();
          } else {
            console.log('❌ User context query still returning null');
            reject(new Error('User context query failed'));
          }
        });
      } else {
        console.log('❌ Admin user not found');
        reject(new Error('Admin user not found'));
      }
    });
  });
};

// Run the fix
async function fixUsersTable() {
  try {
    await addColumns();
    await updateAdminUser();
    await testFix();
    
    console.log('\n🎉 Users table fixed successfully!');
    console.log('The privilege system should now work correctly.');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    db.close();
  }
}

fixUsersTable(); 