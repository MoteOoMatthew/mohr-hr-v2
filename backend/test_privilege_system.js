const { getRow, getRows, runQuery } = require('./database/init');

async function testPrivilegeSystem() {
  console.log('🧪 Testing Privilege System...\n');

  try {
    // Test 1: Check if runQuery is available
    console.log('1️⃣ Testing runQuery availability...');
    if (typeof runQuery === 'function') {
      console.log('✅ runQuery is available');
    } else {
      console.log('❌ runQuery is not available');
      console.log('runQuery type:', typeof runQuery);
      return;
    }

    // Test 2: Test basic database operations
    console.log('\n2️⃣ Testing basic database operations...');
    
    // Test getRow
    const user = await getRow('SELECT * FROM users WHERE email = ?', ['admin@mohr.com']);
    if (user) {
      console.log('✅ getRow working - Admin user found');
      console.log(`   User ID: ${user.id}`);
      console.log(`   Privilege Level: ${user.privilege_level}`);
    } else {
      console.log('❌ getRow failed - Admin user not found');
    }

    // Test getRows
    const users = await getRows('SELECT COUNT(*) as count FROM users');
    if (users && users.length > 0) {
      console.log(`✅ getRows working - Found ${users[0].count} users`);
    } else {
      console.log('❌ getRows failed');
    }

    // Test 3: Test runQuery
    console.log('\n3️⃣ Testing runQuery...');
    try {
      const result = await runQuery('SELECT 1 as test');
      console.log('✅ runQuery working');
      console.log('   Result:', result);
    } catch (error) {
      console.log('❌ runQuery failed:', error.message);
    }

    // Test 4: Test privilege permissions
    console.log('\n4️⃣ Testing privilege permissions...');
    const permissions = await getRows('SELECT * FROM privilege_permissions LIMIT 5');
    if (permissions && permissions.length > 0) {
      console.log(`✅ Privilege permissions found: ${permissions.length} records`);
    } else {
      console.log('❌ No privilege permissions found');
    }

    // Test 5: Test custom privilege levels
    console.log('\n5️⃣ Testing custom privilege levels...');
    const customLevels = await getRows('SELECT * FROM custom_privilege_levels WHERE is_active = 1');
    if (customLevels && customLevels.length > 0) {
      console.log(`✅ Custom privilege levels found: ${customLevels.length} levels`);
    } else {
      console.log('❌ No custom privilege levels found');
    }

    console.log('\n🎉 Privilege system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testPrivilegeSystem(); 