const { google } = require('googleapis')
const fs = require('fs').promises
const path = require('path')
const mime = require('mime-types')

class GoogleDriveService {
  constructor() {
    this.drive = null
    this.backupFolderId = null
    this.isInitialized = false
  }

  /**
   * Initialize Google Drive API
   */
  async initialize(credentials) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      })

      this.drive = google.drive({ version: 'v3', auth })
      
      // Create or find backup folder
      this.backupFolderId = await this.findOrCreateBackupFolder()
      
      this.isInitialized = true
      console.log('✅ Google Drive service initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive:', error)
      return false
    }
  }

  /**
   * Find or create backup folder in Google Drive
   */
  async findOrCreateBackupFolder() {
    try {
      // Search for existing backup folder
      const response = await this.drive.files.list({
        q: "name='MOHR_HR_Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)'
      })

      if (response.data.files.length > 0) {
        return response.data.files[0].id
      }

      // Create new backup folder
      const folderMetadata = {
        name: 'MOHR_HR_Backups',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Encrypted backups for MOHR HR System'
      }

      const folder = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      })

      console.log('📁 Created backup folder in Google Drive')
      return folder.data.id
    } catch (error) {
      console.error('❌ Failed to create backup folder:', error)
      throw error
    }
  }

  /**
   * Upload encrypted backup to Google Drive
   */
  async uploadBackup(backupPath, backupName) {
    if (!this.isInitialized) {
      throw new Error('Google Drive service not initialized')
    }

    try {
      console.log('☁️ Uploading backup to Google Drive...')

      const fileMetadata = {
        name: backupName,
        parents: [this.backupFolderId],
        description: `MOHR HR Backup - ${new Date().toISOString()}`,
        properties: {
          backupType: 'encrypted',
          system: 'MOHR_HR',
          version: '2.1.2'
        }
      }

      const media = {
        mimeType: 'application/zip',
        body: fs.createReadStream(backupPath)
      }

      const file = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, size, createdTime'
      })

      console.log('✅ Backup uploaded to Google Drive')
      return {
        success: true,
        fileId: file.data.id,
        fileName: file.data.name,
        size: file.data.size,
        createdTime: file.data.createdTime
      }
    } catch (error) {
      console.error('❌ Failed to upload backup:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Download backup from Google Drive
   */
  async downloadBackup(fileId, downloadPath) {
    if (!this.isInitialized) {
      throw new Error('Google Drive service not initialized')
    }

    try {
      console.log('⬇️ Downloading backup from Google Drive...')

      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, {
        responseType: 'stream'
      })

      const writer = fs.createWriteStream(downloadPath)
      response.data.pipe(writer)

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('✅ Backup downloaded from Google Drive')
          resolve({ success: true, path: downloadPath })
        })
        writer.on('error', reject)
      })
    } catch (error) {
      console.error('❌ Failed to download backup:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * List backups in Google Drive
   */
  async listBackups() {
    if (!this.isInitialized) {
      throw new Error('Google Drive service not initialized')
    }

    try {
      const response = await this.drive.files.list({
        q: `'${this.backupFolderId}' in parents and trashed=false`,
        fields: 'files(id, name, size, createdTime, modifiedTime, properties)',
        orderBy: 'createdTime desc'
      })

      return response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        properties: file.properties
      }))
    } catch (error) {
      console.error('❌ Failed to list backups:', error)
      return []
    }
  }

  /**
   * Delete backup from Google Drive
   */
  async deleteBackup(fileId) {
    if (!this.isInitialized) {
      throw new Error('Google Drive service not initialized')
    }

    try {
      await this.drive.files.delete({
        fileId: fileId
      })

      console.log('🗑️ Backup deleted from Google Drive')
      return { success: true }
    } catch (error) {
      console.error('❌ Failed to delete backup:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Clean up old backups in Google Drive (keep last N)
   */
  async cleanupOldBackups(keepCount = 7) {
    try {
      const backups = await this.listBackups()
      
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount)
        
        for (const backup of toDelete) {
          await this.deleteBackup(backup.id)
          console.log(`🗑️ Deleted old cloud backup: ${backup.name}`)
        }
      }
    } catch (error) {
      console.error('❌ Failed to cleanup old cloud backups:', error)
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo() {
    if (!this.isInitialized) {
      throw new Error('Google Drive service not initialized')
    }

    try {
      const backups = await this.listBackups()
      const totalSize = backups.reduce((sum, backup) => sum + parseInt(backup.size || 0), 0)
      
      return {
        totalBackups: backups.length,
        totalSize: totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
      }
    } catch (error) {
      console.error('❌ Failed to get storage info:', error)
      return { totalBackups: 0, totalSize: 0, totalSizeMB: 0 }
    }
  }

  /**
   * Test Google Drive connection
   */
  async testConnection() {
    if (!this.isInitialized) {
      return { success: false, error: 'Service not initialized' }
    }

    try {
      await this.drive.files.list({
        pageSize: 1,
        fields: 'files(id)'
      })
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

module.exports = new GoogleDriveService() 