const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, 'database', 'mohr_hr_v2.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Debugging User Context Issue\n');

// Check the users table structure
db.all("PRAGMA table_info(users)", (err, columns) => {
  if (err) {
    console.error('❌ Error getting table info:', err);
    return;
  }
  
  console.log('📋 Users table structure:');
  columns.forEach(col => {
    console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  console.log('');
});

// Check the admin user record
db.get("SELECT * FROM users WHERE email = 'admin@mohr.com'", (err, user) => {
  if (err) {
    console.error('❌ Error getting admin user:', err);
    return;
  }
  
  if (user) {
    console.log('👤 Admin user record:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Privilege Level: ${user.privilege_level}`);
    console.log(`   Department ID: ${user.department_id}`);
    console.log(`   Manager ID: ${user.manager_id}`);
    console.log(`   Is Active: ${user.is_active}`);
    console.log('');
    
    // Test the getUserContext query
    db.get(`
      SELECT u.id, u.privilege_level, u.department_id, u.manager_id,
             d.name as department_name, d.manager_id as dept_manager_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `, [user.id], (err, context) => {
      if (err) {
        console.error('❌ Error getting user context:', err);
        return;
      }
      
      if (context) {
        console.log('✅ User context query successful:');
        console.log(`   ID: ${context.id}`);
        console.log(`   Privilege Level: ${context.privilege_level}`);
        console.log(`   Department ID: ${context.department_id}`);
        console.log(`   Manager ID: ${context.manager_id}`);
        console.log(`   Department Name: ${context.department_name}`);
        console.log(`   Dept Manager ID: ${context.dept_manager_id}`);
      } else {
        console.log('❌ User context query returned null');
      }
      
      db.close();
    });
  } else {
    console.log('❌ Admin user not found');
    db.close();
  }
}); 