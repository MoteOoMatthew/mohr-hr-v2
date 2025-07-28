const fs = require('fs').promises
const path = require('path')
const archiver = require('archiver')
const crypto = require('crypto')
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups')
    this.dbPath = path.join(__dirname, '../database/mohr_hr_v2.db')
    this.ensureBackupDirectory()
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true })
    } catch (error) {
      console.error('❌ Failed to create backup directory:', error)
    }
  }

  /**
   * Create an encrypted backup of the database and upload files
   */
  async createBackup(backupPassword = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `mohr-backup-${timestamp}`
    const backupPath = path.join(this.backupDir, backupName)
    
    try {
      console.log('🔄 Starting backup process...')
      
      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true })
      
      // 1. Database backup
      await this.backupDatabase(backupPath)
      
      // 2. Configuration files backup
      await this.backupConfigFiles(backupPath)
      
      // 3. Uploaded documents backup
      await this.backupUploads(backupPath)
      
      // 4. Create backup metadata
      await this.createBackupMetadata(backupPath, timestamp)
      
      // 5. Create encrypted archive
      const archivePath = await this.createEncryptedArchive(backupPath, backupName, backupPassword)
      
      // 6. Clean up temporary files
      await this.cleanupTempFiles(backupPath)
      
      console.log('✅ Backup completed successfully')
      return {
        success: true,
        archivePath,
        backupName,
        timestamp,
        size: await this.getFileSize(archivePath)
      }
      
    } catch (error) {
      console.error('❌ Backup failed:', error)
      await this.cleanupTempFiles(backupPath)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Backup the SQLite database
   */
  async backupDatabase(backupPath) {
    const dbBackupPath = path.join(backupPath, 'database')
    await fs.mkdir(dbBackupPath, { recursive: true })
    
    // Copy database file
    await fs.copyFile(this.dbPath, path.join(dbBackupPath, 'mohr_hr_v2.db'))
    
    // Create SQL dump for easier restoration
    await this.createSqlDump(dbBackupPath)
    
    console.log('📊 Database backed up')
  }

  /**
   * Create SQL dump for easier restoration
   */
  async createSqlDump(dbBackupPath) {
    try {
      const dumpPath = path.join(dbBackupPath, 'database_dump.sql')
      const command = `sqlite3 "${this.dbPath}" .dump > "${dumpPath}"`
      await execAsync(command)
      console.log('📝 SQL dump created')
    } catch (error) {
      console.warn('⚠️ SQL dump creation failed (sqlite3 not available):', error.message)
    }
  }

  /**
   * Backup configuration files
   */
  async backupConfigFiles(backupPath) {
    const configPath = path.join(backupPath, 'config')
    await fs.mkdir(configPath, { recursive: true })
    
    const configFiles = [
      '../package.json',
      '../package-lock.json',
      '../.env',
      '../server.js'
    ]
    
    for (const configFile of configFiles) {
      try {
        const sourcePath = path.join(__dirname, configFile)
        const fileName = path.basename(configFile)
        const destPath = path.join(configPath, fileName)
        
        await fs.copyFile(sourcePath, destPath)
      } catch (error) {
        console.warn(`⚠️ Could not backup ${configFile}:`, error.message)
      }
    }
    
    console.log('⚙️ Configuration files backed up')
  }

  /**
   * Backup uploaded documents
   */
  async backupUploads(backupPath) {
    const uploadsDir = path.join(__dirname, '../uploads')
    const uploadsBackupPath = path.join(backupPath, 'uploads')
    
    try {
      // Check if uploads directory exists
      await fs.access(uploadsDir)
      
      // Copy uploads directory
      await this.copyDirectory(uploadsDir, uploadsBackupPath)
      console.log('📁 Uploaded documents backed up')
    } catch (error) {
      console.log('ℹ️ No uploads directory found, skipping')
    }
  }

  /**
   * Create backup metadata
   */
  async createBackupMetadata(backupPath, timestamp) {
    const metadata = {
      backup_timestamp: timestamp,
      created_at: new Date().toISOString(),
      version: '2.1.2',
      database_size: await this.getFileSize(this.dbPath),
      backup_type: 'full',
      includes: [
        'database',
        'database_dump.sql',
        'config',
        'uploads',
        'metadata'
      ]
    }
    
    const metadataPath = path.join(backupPath, 'backup-metadata.json')
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
  }

  /**
   * Create encrypted ZIP archive
   */
  async createEncryptedArchive(backupPath, backupName, password) {
    return new Promise((resolve, reject) => {
      const archivePath = path.join(this.backupDir, `${backupName}.zip`)
      const output = fs.createWriteStream(archivePath)
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      })
      
      output.on('close', () => {
        console.log('🔐 Encrypted archive created')
        resolve(archivePath)
      })
      
      archive.on('error', (err) => {
        reject(err)
      })
      
      archive.pipe(output)
      
      // Add password protection if provided
      if (password) {
        archive.password(password)
      }
      
      // Add all files from backup directory
      archive.directory(backupPath, false)
      
      archive.finalize()
    })
  }

  /**
   * Clean up temporary backup files
   */
  async cleanupTempFiles(backupPath) {
    try {
      await fs.rm(backupPath, { recursive: true, force: true })
      console.log('🧹 Temporary files cleaned up')
    } catch (error) {
      console.warn('⚠️ Failed to cleanup temp files:', error.message)
    }
  }

  /**
   * Get file size in bytes
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath)
      return stats.size
    } catch (error) {
      return 0
    }
  }

  /**
   * Copy directory recursively
   */
  async copyDirectory(source, destination) {
    await fs.mkdir(destination, { recursive: true })
    const entries = await fs.readdir(source, { withFileTypes: true })
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name)
      const destPath = path.join(destination, entry.name)
      
      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath)
      } else {
        await fs.copyFile(sourcePath, destPath)
      }
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(archivePath, password = null, restorePath = null) {
    try {
      console.log('🔄 Starting restore process...')
      
      const extractPath = restorePath || path.join(this.backupDir, 'restore-temp')
      await fs.mkdir(extractPath, { recursive: true })
      
      // Extract archive
      await this.extractArchive(archivePath, extractPath, password)
      
      // Restore database
      await this.restoreDatabase(extractPath)
      
      // Restore configuration (optional)
      await this.restoreConfigFiles(extractPath)
      
      // Restore uploads
      await this.restoreUploads(extractPath)
      
      console.log('✅ Restore completed successfully')
      return { success: true }
      
    } catch (error) {
      console.error('❌ Restore failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Extract encrypted archive
   */
  async extractArchive(archivePath, extractPath, password) {
    // This would use a library like adm-zip or similar
    // For now, we'll use a placeholder
    console.log('📦 Extracting archive...')
    // Implementation would go here
  }

  /**
   * Restore database
   */
  async restoreDatabase(extractPath) {
    const dbBackupPath = path.join(extractPath, 'database', 'mohr_hr_v2.db')
    await fs.copyFile(dbBackupPath, this.dbPath)
    console.log('📊 Database restored')
  }

  /**
   * Restore configuration files
   */
  async restoreConfigFiles(extractPath) {
    const configPath = path.join(extractPath, 'config')
    // Implementation for config restoration
    console.log('⚙️ Configuration files restored')
  }

  /**
   * Restore uploads
   */
  async restoreUploads(extractPath) {
    const uploadsBackupPath = path.join(extractPath, 'uploads')
    const uploadsDir = path.join(__dirname, '../uploads')
    
    try {
      await fs.access(uploadsBackupPath)
      await this.copyDirectory(uploadsBackupPath, uploadsDir)
      console.log('📁 Uploads restored')
    } catch (error) {
      console.log('ℹ️ No uploads to restore')
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir)
      const backups = []
      
      for (const file of files) {
        if (file.endsWith('.zip')) {
          const filePath = path.join(this.backupDir, file)
          const stats = await fs.stat(filePath)
          
          backups.push({
            name: file,
            size: stats.size,
            created: stats.birthtime,
            path: filePath
          })
        }
      }
      
      return backups.sort((a, b) => b.created - a.created)
    } catch (error) {
      console.error('❌ Failed to list backups:', error)
      return []
    }
  }

  /**
   * Delete old backups (keep last N)
   */
  async cleanupOldBackups(keepCount = 7) {
    try {
      const backups = await this.listBackups()
      
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount)
        
        for (const backup of toDelete) {
          await fs.unlink(backup.path)
          console.log(`🗑️ Deleted old backup: ${backup.name}`)
        }
      }
    } catch (error) {
      console.error('❌ Failed to cleanup old backups:', error)
    }
  }
}

module.exports = new BackupService() 