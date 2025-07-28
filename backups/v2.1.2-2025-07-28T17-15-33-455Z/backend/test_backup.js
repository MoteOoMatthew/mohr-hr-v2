const backupService = require('./services/backupService')
const backupScheduler = require('./services/backupScheduler')

async function testBackupSystem() {
  console.log('🧪 Testing MOHR HR Backup System...\n')
  
  try {
    // Test 1: Initialize backup scheduler
    console.log('1️⃣ Initializing backup scheduler...')
    await backupScheduler.initialize()
    console.log('✅ Backup scheduler initialized\n')
    
    // Test 2: Get backup status
    console.log('2️⃣ Getting backup status...')
    const status = await backupScheduler.getBackupStatus()
    console.log('📊 Backup Status:', JSON.stringify(status, null, 2))
    console.log('✅ Backup status retrieved\n')
    
    // Test 3: Create manual backup
    console.log('3️⃣ Creating manual backup...')
    const backupResult = await backupScheduler.performManualBackup('test-password-123')
    
    if (backupResult.success) {
      console.log('✅ Manual backup created successfully')
      console.log('📁 Backup path:', backupResult.archivePath)
      console.log('📏 Backup size:', backupResult.size, 'bytes')
      console.log('🕐 Timestamp:', backupResult.timestamp)
    } else {
      console.log('❌ Manual backup failed:', backupResult.error)
    }
    console.log()
    
    // Test 4: List backups
    console.log('4️⃣ Listing available backups...')
    const backups = await backupService.listBackups()
    console.log('📋 Found', backups.length, 'backup(s)')
    backups.forEach((backup, index) => {
      console.log(`   ${index + 1}. ${backup.name} (${backup.size} bytes)`)
    })
    console.log('✅ Backup listing completed\n')
    
    // Test 5: Test backup system
    console.log('5️⃣ Running backup system test...')
    const testResult = await backupScheduler.testBackup()
    
    if (testResult.success) {
      console.log('✅ Backup system test passed')
    } else {
      console.log('❌ Backup system test failed:', testResult.error)
    }
    console.log()
    
    console.log('🎉 Backup system test completed successfully!')
    
  } catch (error) {
    console.error('❌ Backup system test failed:', error)
  }
}

// Run the test
testBackupSystem() 