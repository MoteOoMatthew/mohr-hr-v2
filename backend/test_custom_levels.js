const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, 'database', 'mohr_hr_v2.db');
const db = new sqlite3.Database(dbPath);

console.log('🧪 Testing Custom Privilege Level System\n');

// Test 1: Check if custom privilege levels were created
console.log('1️⃣ Testing Custom Privilege Levels Creation...');
db.all("SELECT * FROM custom_privilege_levels WHERE is_active = 1 ORDER BY level_number", (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }
  
  console.log(`✅ Found ${rows.length} custom privilege levels:`);
  rows.forEach(level => {
    const permissions = JSON.parse(level.permissions);
    console.log(`   Level ${level.level_number}: ${level.name}`);
    console.log(`   Description: ${level.description}`);
    console.log(`   Permissions: ${permissions.length} total`);
    console.log('');
  });
});

// Test 2: Check privilege permissions for standard levels
console.log('2️⃣ Testing Standard Privilege Levels...');
db.all("SELECT privilege_level, COUNT(*) as permission_count FROM privilege_permissions GROUP BY privilege_level ORDER BY privilege_level", (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }
  
  console.log('✅ Standard privilege levels:');
  rows.forEach(row => {
    console.log(`   Level ${row.privilege_level}: ${row.permission_count} permissions`);
  });
  console.log('');
});

// Test 3: Check permission templates
console.log('3️⃣ Testing Permission Templates...');
db.all("SELECT * FROM permission_templates ORDER BY name", (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }
  
  console.log(`✅ Found ${rows.length} permission templates:`);
  rows.forEach(template => {
    const permissions = JSON.parse(template.permissions);
    console.log(`   ${template.name}: ${permissions.length} permissions`);
    console.log(`   Description: ${template.description}`);
    console.log('');
  });
});

// Test 4: Check user permissions table structure
console.log('4️⃣ Testing User Permissions Table...');
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='user_permissions'", (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }
  
  if (rows.length > 0) {
    console.log('✅ User permissions table exists');
    
    // Check table structure
    db.all("PRAGMA table_info(user_permissions)", (err, columns) => {
      if (err) {
        console.error('❌ Error:', err);
        return;
      }
      
      console.log('   Table structure:');
      columns.forEach(col => {
        console.log(`     ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
      console.log('');
    });
  } else {
    console.log('❌ User permissions table not found');
  }
});

// Test 5: Check departments table
console.log('5️⃣ Testing Departments Table...');
db.all("SELECT * FROM departments ORDER BY name", (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }
  
  console.log(`✅ Found ${rows.length} departments:`);
  rows.forEach(dept => {
    console.log(`   ${dept.name}: ${dept.description || 'No description'}`);
  });
  console.log('');
});

// Test 6: Check users table structure
console.log('6️⃣ Testing Users Table Structure...');
db.all("PRAGMA table_info(users)", (err, columns) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }
  
  console.log('✅ Users table structure:');
  const privilegeColumns = columns.filter(col => 
    col.name.includes('privilege') || 
    col.name.includes('department') || 
    col.name.includes('manager')
  );
  
  privilegeColumns.forEach(col => {
    console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });
  console.log('');
});

// Test 7: Check default admin user
console.log('7️⃣ Testing Default Admin User...');
db.get("SELECT id, name, email, privilege_level FROM users WHERE email = 'admin@mohr.com'", (err, user) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }
  
  if (user) {
    console.log(`✅ Default admin user found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Privilege Level: ${user.privilege_level}`);
    console.log('');
  } else {
    console.log('❌ Default admin user not found');
  }
});

// Test 8: Simulate permission check for custom level
console.log('8️⃣ Testing Custom Level Permission Check...');
db.get("SELECT permissions FROM custom_privilege_levels WHERE level_number = 6", (err, level) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }
  
  if (level) {
    const permissions = JSON.parse(level.permissions);
    const employeeReadPermission = permissions.find(p => 
      p.resource_type === 'employees' && p.action === 'read'
    );
    
    if (employeeReadPermission) {
      console.log(`✅ Level 6 (Senior HR Specialist) has employee read permission:`);
      console.log(`   Resource: ${employeeReadPermission.resource_type}`);
      console.log(`   Action: ${employeeReadPermission.action}`);
      console.log(`   Scope: ${employeeReadPermission.scope}`);
      console.log('');
    } else {
      console.log('❌ Level 6 missing employee read permission');
    }
  } else {
    console.log('❌ Level 6 not found');
  }
});

// Close database after all tests
setTimeout(() => {
  console.log('🎉 All tests completed!');
  db.close();
}, 2000); 