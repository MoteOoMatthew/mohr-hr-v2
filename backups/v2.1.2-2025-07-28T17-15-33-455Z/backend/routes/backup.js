const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const backupService = require('../services/backupService')
const backupScheduler = require('../services/backupScheduler')
const googleDriveService = require('../services/googleDriveService')
const { requirePrivilegeLevel } = require('../middleware/privilege')
const fs = require('fs/promises')
const path = require('path')

// Import verifyToken from auth routes
const { verifyToken } = require('./auth')

/**
 * GET /api/backup/status
 * Get backup system status
 */
router.get('/status', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    const status = await backupScheduler.getBackupStatus()
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error('❌ Failed to get backup status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get backup status'
    })
  }
})

/**
 * POST /api/backup/create
 * Create manual backup
 */
router.post('/create', [
  verifyToken,
  requirePrivilegeLevel(5),
  body('password').optional().isString().isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: errors.array()
      })
    }

    const { password } = req.body
    const result = await backupScheduler.performManualBackup(password)
    
    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: 'Backup created successfully'
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    console.error('❌ Failed to create backup:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    })
  }
})

/**
 * GET /api/backup/list
 * List available backups
 */
router.get('/list', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    const localBackups = await backupService.listBackups()
    const cloudBackups = googleDriveService.isInitialized 
      ? await googleDriveService.listBackups()
      : []

    res.json({
      success: true,
      data: {
        local: localBackups,
        cloud: cloudBackups
      }
    })
  } catch (error) {
    console.error('❌ Failed to list backups:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to list backups'
    })
  }
})

/**
 * POST /api/backup/restore
 * Restore from backup
 */
router.post('/restore', [
  verifyToken,
  requirePrivilegeLevel(5),
  body('backupPath').isString().notEmpty(),
  body('password').optional().isString(),
  body('source').isIn(['local', 'cloud']).withMessage('Source must be local or cloud')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: errors.array()
      })
    }

    const { backupPath, password, source } = req.body

    let result
    if (source === 'cloud') {
      // Download from cloud first
      const downloadPath = path.join(__dirname, '../backups', 'restore-temp.zip')
      const downloadResult = await googleDriveService.downloadBackup(backupPath, downloadPath)
      
      if (!downloadResult.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to download backup from cloud'
        })
      }
      
      result = await backupService.restoreFromBackup(downloadPath, password)
      
      // Clean up downloaded file
      await fs.unlink(downloadPath)
    } else {
      result = await backupService.restoreFromBackup(backupPath, password)
    }

    if (result.success) {
      res.json({
        success: true,
        message: 'Backup restored successfully'
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    console.error('❌ Failed to restore backup:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to restore backup'
    })
  }
})

/**
 * DELETE /api/backup/:id
 * Delete backup
 */
router.delete('/:id', [
  verifyToken,
  requirePrivilegeLevel(5),
  body('source').isIn(['local', 'cloud']).withMessage('Source must be local or cloud')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: errors.array()
      })
    }

    const { id } = req.params
    const { source } = req.body

    let result
    if (source === 'cloud') {
      result = await googleDriveService.deleteBackup(id)
    } else {
      // For local backups, id is the filename
      const backupPath = path.join(__dirname, '../backups', id)
      await fs.unlink(backupPath)
      result = { success: true }
    }

    if (result.success) {
      res.json({
        success: true,
        message: 'Backup deleted successfully'
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    console.error('❌ Failed to delete backup:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete backup'
    })
  }
})

/**
 * GET /api/backup/config
 * Get backup configuration
 */
router.get('/config', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    res.json({
      success: true,
      data: backupScheduler.backupConfig
    })
  } catch (error) {
    console.error('❌ Failed to get backup config:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get backup configuration'
    })
  }
})

/**
 * PUT /api/backup/config
 * Update backup configuration
 */
router.put('/config', [
  verifyToken,
  requirePrivilegeLevel(5),
  body('enabled').optional().isBoolean(),
  body('schedule').optional().isString(),
  body('password').optional().isString().isLength({ min: 6 }),
  body('keepLocalBackups').optional().isInt({ min: 1, max: 100 }),
  body('keepCloudBackups').optional().isInt({ min: 1, max: 365 }),
  body('uploadToCloud').optional().isBoolean(),
  body('compressionLevel').optional().isInt({ min: 1, max: 9 })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: errors.array()
      })
    }

    const result = await backupScheduler.updateConfiguration(req.body)
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Backup configuration updated successfully',
        data: backupScheduler.backupConfig
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    console.error('❌ Failed to update backup config:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update backup configuration'
    })
  }
})

/**
 * POST /api/backup/test
 * Test backup system
 */
router.post('/test', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    const result = await backupScheduler.testBackup()
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      })
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    console.error('❌ Failed to test backup system:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to test backup system'
    })
  }
})

/**
 * POST /api/backup/cleanup
 * Manually trigger cleanup of old backups
 */
router.post('/cleanup', verifyToken, requirePrivilegeLevel(5), async (req, res) => {
  try {
    await backupScheduler.cleanupOldBackups()
    
    res.json({
      success: true,
      message: 'Backup cleanup completed successfully'
    })
  } catch (error) {
    console.error('❌ Failed to cleanup backups:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup backups'
    })
  }
})

/**
 * POST /api/backup/initialize-google
 * Initialize Google Drive integration
 */
router.post('/initialize-google', [
  verifyToken,
  requirePrivilegeLevel(5),
  body('credentials').isObject().withMessage('Google credentials required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: errors.array()
      })
    }

    const { credentials } = req.body
    const result = await googleDriveService.initialize(credentials)
    
    if (result) {
      res.json({
        success: true,
        message: 'Google Drive integration initialized successfully'
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to initialize Google Drive integration'
      })
    }
  } catch (error) {
    console.error('❌ Failed to initialize Google Drive:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Google Drive integration'
    })
  }
})

module.exports = router 