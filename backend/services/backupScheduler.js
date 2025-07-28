const cron = require('node-cron')
const backupService = require('./backupService')
const googleDriveService = require('./googleDriveService')
const fs = require('fs').promises
const path = require('path')

class BackupScheduler {
  constructor() {
    this.isRunning = false
    this.scheduledJobs = new Map()
    this.backupConfig = {
      enabled: true,
      schedule: '0 2 * * *', // Daily at 2 AM
      password: process.env.BACKUP_PASSWORD || 'mohr-backup-2024',
      keepLocalBackups: 7,
      keepCloudBackups: 30,
      uploadToCloud: true,
      compressionLevel: 9
    }
  }

  /**
   * Initialize the backup scheduler
   */
  async initialize() {
    try {
      console.log('🕐 Initializing backup scheduler...')
      
      // Load configuration
      await this.loadConfiguration()
      
      // Start scheduled backup
      if (this.backupConfig.enabled) {
        this.startScheduledBackup()
      }
      
      console.log('✅ Backup scheduler initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize backup scheduler:', error)
      return false
    }
  }

  /**
   * Load backup configuration
   */
  async loadConfiguration() {
    try {
      const configPath = path.join(__dirname, '../config/backup-config.json')
      const configData = await fs.readFile(configPath, 'utf8')
      this.backupConfig = { ...this.backupConfig, ...JSON.parse(configData) }
    } catch (error) {
      console.log('ℹ️ Using default backup configuration')
      await this.saveConfiguration()
    }
  }

  /**
   * Save backup configuration
   */
  async saveConfiguration() {
    try {
      const configDir = path.join(__dirname, '../config')
      await fs.mkdir(configDir, { recursive: true })
      
      const configPath = path.join(configDir, 'backup-config.json')
      await fs.writeFile(configPath, JSON.stringify(this.backupConfig, null, 2))
    } catch (error) {
      console.error('❌ Failed to save backup configuration:', error)
    }
  }

  /**
   * Start scheduled backup job
   */
  startScheduledBackup() {
    if (this.scheduledJobs.has('daily-backup')) {
      this.scheduledJobs.get('daily-backup').stop()
    }

    const job = cron.schedule(this.backupConfig.schedule, async () => {
      await this.performScheduledBackup()
    }, {
      scheduled: true,
      timezone: 'UTC'
    })

    this.scheduledJobs.set('daily-backup', job)
    console.log(`🕐 Scheduled daily backup for: ${this.backupConfig.schedule}`)
  }

  /**
   * Perform scheduled backup
   */
  async performScheduledBackup() {
    if (this.isRunning) {
      console.log('⚠️ Backup already running, skipping...')
      return
    }

    this.isRunning = true
    console.log('🔄 Starting scheduled backup...')

    try {
      // 1. Create local backup
      const backupResult = await backupService.createBackup(this.backupConfig.password)
      
      if (!backupResult.success) {
        throw new Error(`Backup creation failed: ${backupResult.error}`)
      }

      // 2. Upload to Google Drive if enabled
      if (this.backupConfig.uploadToCloud && googleDriveService.isInitialized) {
        const uploadResult = await googleDriveService.uploadBackup(
          backupResult.archivePath,
          backupResult.backupName + '.zip'
        )
        
        if (uploadResult.success) {
          console.log('☁️ Backup uploaded to Google Drive')
        } else {
          console.warn('⚠️ Failed to upload to Google Drive:', uploadResult.error)
        }
      }

      // 3. Cleanup old backups
      await this.cleanupOldBackups()

      console.log('✅ Scheduled backup completed successfully')
      
    } catch (error) {
      console.error('❌ Scheduled backup failed:', error)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Perform manual backup
   */
  async performManualBackup(password = null) {
    if (this.isRunning) {
      return { success: false, error: 'Backup already running' }
    }

    this.isRunning = true
    console.log('🔄 Starting manual backup...')

    try {
      const backupPassword = password || this.backupConfig.password
      const backupResult = await backupService.createBackup(backupPassword)
      
      if (!backupResult.success) {
        throw new Error(backupResult.error)
      }

      // Upload to cloud if enabled
      if (this.backupConfig.uploadToCloud && googleDriveService.isInitialized) {
        const uploadResult = await googleDriveService.uploadBackup(
          backupResult.archivePath,
          backupResult.backupName + '.zip'
        )
        
        if (uploadResult.success) {
          backupResult.cloudUpload = uploadResult
        }
      }

      return backupResult
      
    } catch (error) {
      console.error('❌ Manual backup failed:', error)
      return { success: false, error: error.message }
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Cleanup old backups
   */
  async cleanupOldBackups() {
    try {
      // Cleanup local backups
      await backupService.cleanupOldBackups(this.backupConfig.keepLocalBackups)
      
      // Cleanup cloud backups
      if (googleDriveService.isInitialized) {
        await googleDriveService.cleanupOldBackups(this.backupConfig.keepCloudBackups)
      }
      
      console.log('🧹 Old backups cleaned up')
    } catch (error) {
      console.error('❌ Failed to cleanup old backups:', error)
    }
  }

  /**
   * Get backup status
   */
  async getBackupStatus() {
    try {
      const localBackups = await backupService.listBackups()
      const cloudBackups = googleDriveService.isInitialized 
        ? await googleDriveService.listBackups()
        : []
      
      const storageInfo = googleDriveService.isInitialized
        ? await googleDriveService.getStorageInfo()
        : { totalBackups: 0, totalSizeMB: 0 }

      return {
        scheduler: {
          enabled: this.backupConfig.enabled,
          schedule: this.backupConfig.schedule,
          isRunning: this.isRunning,
          nextBackup: this.getNextBackupTime()
        },
        local: {
          backups: localBackups.length,
          latest: localBackups[0] || null
        },
        cloud: {
          enabled: this.backupConfig.uploadToCloud,
          initialized: googleDriveService.isInitialized,
          backups: cloudBackups.length,
          storageUsed: storageInfo.totalSizeMB,
          latest: cloudBackups[0] || null
        }
      }
    } catch (error) {
      console.error('❌ Failed to get backup status:', error)
      return { error: error.message }
    }
  }

  /**
   * Get next scheduled backup time
   */
  getNextBackupTime() {
    try {
      const cronParser = require('cron-parser')
      const interval = cronParser.parseExpression(this.backupConfig.schedule)
      return interval.next().toDate()
    } catch (error) {
      return null
    }
  }

  /**
   * Update backup configuration
   */
  async updateConfiguration(newConfig) {
    this.backupConfig = { ...this.backupConfig, ...newConfig }
    await this.saveConfiguration()
    
    // Restart scheduler if schedule changed
    if (newConfig.schedule && newConfig.schedule !== this.backupConfig.schedule) {
      this.startScheduledBackup()
    }
    
    return { success: true }
  }

  /**
   * Test backup system
   */
  async testBackup() {
    try {
      console.log('🧪 Testing backup system...')
      
      // Test local backup
      const backupResult = await backupService.createBackup('test-password')
      
      if (!backupResult.success) {
        throw new Error(`Local backup test failed: ${backupResult.error}`)
      }
      
      // Test cloud upload if available
      if (googleDriveService.isInitialized) {
        const uploadResult = await googleDriveService.uploadBackup(
          backupResult.archivePath,
          'test-backup.zip'
        )
        
        if (uploadResult.success) {
          // Clean up test file
          await googleDriveService.deleteBackup(uploadResult.fileId)
        }
      }
      
      // Clean up test backup
      await fs.unlink(backupResult.archivePath)
      
      return { success: true, message: 'Backup system test passed' }
      
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    for (const [name, job] of this.scheduledJobs) {
      job.stop()
      console.log(`🛑 Stopped scheduled job: ${name}`)
    }
    this.scheduledJobs.clear()
  }
}

module.exports = new BackupScheduler() 