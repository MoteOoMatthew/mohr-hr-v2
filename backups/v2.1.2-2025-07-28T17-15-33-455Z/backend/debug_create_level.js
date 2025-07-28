const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Import the function
const { createCustomPrivilegeLevel } = require('./middleware/privilege');

console.log('🔍 Debugging createCustomPrivilegeLevel Function\n');

async function testCreateLevel() {
  try {
    console.log('1️⃣ Testing createCustomPrivilegeLevel function...');
    
    const testLevel = {
      level_number: 16,
      name: 'Debug Test Level',
      description: 'Testing the create function',
      permissions: [
        { resource_type: 'employees', action: 'read', scope: 'department' },
        { resource_type: 'leave_requests', action: 'read', scope: 'department' }
      ]
    };

    console.log('   Input data:', JSON.stringify(testLevel, null, 2));
    
    const result = await createCustomPrivilegeLevel(
      testLevel.level_number,
      testLevel.name,
      testLevel.description,
      testLevel.permissions,
      1 // admin user ID
    );

    console.log('   Result:', result);
    
    if (result.success) {
      console.log('✅ Custom level created successfully!');
    } else {
      console.log('❌ Failed to create custom level:', result.error);
    }

  } catch (error) {
    console.error('❌ Error testing createCustomPrivilegeLevel:', error);
  }
}

testCreateLevel(); 