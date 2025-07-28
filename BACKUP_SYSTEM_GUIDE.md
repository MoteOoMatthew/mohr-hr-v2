# 🔐 MOHR HR System - Backup & Recovery Architecture

## 📋 Overview

The MOHR HR System implements a robust, multi-layered backup architecture designed for enterprise-grade data protection with seamless Google Drive integration. This system ensures data integrity, provides quick recovery options, and maintains compliance with security requirements.

## 🏗️ Architecture Components

### 1. **Backup Service** (`backend/services/backupService.js`)
- **Purpose**: Core backup creation and restoration engine
- **Features**:
  - Encrypted ZIP archive creation with password protection
  - Complete database backup with SQL dump
  - Configuration files backup
  - Uploaded documents backup
  - Metadata tracking for each backup
  - Automatic cleanup of temporary files

### 2. **Google Drive Service** (`backend/services/googleDriveService.js`)
- **Purpose**: Cloud storage integration for off-site backups
- **Features**:
  - Automated upload to Google Drive
  - Dedicated backup folder management
  - File metadata and versioning
  - Download and restore capabilities
  - Storage usage monitoring

### 3. **Backup Scheduler** (`backend/services/backupScheduler.js`)
- **Purpose**: Automated backup orchestration
- **Features**:
  - Cron-based scheduling (default: daily at 2 AM UTC)
  - Manual backup triggers
  - Configuration management
  - Status monitoring
  - Automatic cleanup of old backups

### 4. **Backup API** (`backend/routes/backup.js`)
- **Purpose**: RESTful interface for backup management
- **Features**:
  - Manual backup creation
  - Backup listing and status
  - Restore operations
  - Configuration management
  - System testing

## 🔧 Configuration

### Environment Variables
```bash
# Backup Configuration
BACKUP_PASSWORD=mohr-backup-2024          # Default backup encryption password
BACKUP_SCHEDULE=0 2 * * *                 # Cron schedule (daily at 2 AM)
BACKUP_KEEP_LOCAL=7                       # Keep 7 local backups
BACKUP_KEEP_CLOUD=30                      # Keep 30 cloud backups
BACKUP_UPLOAD_TO_CLOUD=true               # Enable cloud uploads
BACKUP_COMPRESSION_LEVEL=9                # Maximum compression
```

### Configuration File (`backend/config/backup-config.json`)
```json
{
  "enabled": true,
  "schedule": "0 2 * * *",
  "password": "mohr-backup-2024",
  "keepLocalBackups": 7,
  "keepCloudBackups": 30,
  "uploadToCloud": true,
  "compressionLevel": 9
}
```

## 📦 What Gets Backed Up

### 1. **Database**
- Complete SQLite database file (`mohr_hr_v2.db`)
- SQL dump for easy restoration
- Database metadata and version information

### 2. **Configuration Files**
- `package.json` and `package-lock.json`
- Environment configuration (`.env`)
- Server configuration (`server.js`)
- Database initialization scripts

### 3. **Uploaded Documents**
- All user-uploaded files
- Document metadata
- File permissions and access controls

### 4. **Backup Metadata**
- Timestamp and version information
- Backup type and contents
- File sizes and checksums
- System configuration at backup time

## 🔐 Security Features

### Encryption
- **Password-protected ZIP archives**
- **AES-256 encryption** for all backup files
- **Configurable encryption passwords**
- **Secure key management**

### Access Control
- **Privilege-based access** (Level 5+ required)
- **API authentication** for all backup operations
- **Audit logging** for backup activities
- **Secure credential storage**

### Data Integrity
- **Checksum verification** for backup files
- **Metadata validation** during restore
- **Automatic corruption detection**
- **Backup verification testing**

## 🚀 Usage Guide

### Manual Backup Creation
```bash
# API Endpoint
POST /api/backup/create
{
  "password": "custom-password"  // Optional
}

# Response
{
  "success": true,
  "data": {
    "archivePath": "/path/to/backup.zip",
    "backupName": "mohr-backup-2024-01-15T02-00-00-000Z",
    "timestamp": "2024-01-15T02:00:00.000Z",
    "size": 1048576
  }
}
```

### Backup Status Check
```bash
# API Endpoint
GET /api/backup/status

# Response
{
  "success": true,
  "data": {
    "scheduler": {
      "enabled": true,
      "schedule": "0 2 * * *",
      "isRunning": false,
      "nextBackup": "2024-01-16T02:00:00.000Z"
    },
    "local": {
      "backups": 7,
      "latest": {
        "name": "mohr-backup-2024-01-15T02-00-00-000Z.zip",
        "size": 1048576,
        "created": "2024-01-15T02:00:00.000Z"
      }
    },
    "cloud": {
      "enabled": true,
      "initialized": true,
      "backups": 30,
      "storageUsed": 314.5,
      "latest": {
        "id": "1ABC123...",
        "name": "mohr-backup-2024-01-15T02-00-00-000Z.zip",
        "size": "1048576",
        "createdTime": "2024-01-15T02:00:00.000Z"
      }
    }
  }
}
```

### Restore from Backup
```bash
# API Endpoint
POST /api/backup/restore
{
  "backupPath": "/path/to/backup.zip",
  "password": "backup-password",
  "source": "local"  // or "cloud"
}

# Response
{
  "success": true,
  "message": "Backup restored successfully"
}
```

## 🔄 Google Drive Integration

### Setup Process
1. **Create Google Cloud Project**
   - Enable Google Drive API
   - Create service account credentials
   - Download JSON credentials file

2. **Initialize Integration**
```bash
POST /api/backup/initialize-google
{
  "credentials": {
    "type": "service_account",
    "project_id": "your-project-id",
    "private_key_id": "...",
    "private_key": "...",
    "client_email": "...",
    "client_id": "..."
  }
}
```

3. **Automatic Features**
   - **Daily uploads** to Google Drive
   - **Dedicated folder** (`MOHR_HR_Backups`)
   - **Version management** and metadata
   - **Automatic cleanup** of old cloud backups

### Cloud Storage Benefits
- **Off-site protection** against local disasters
- **Geographic redundancy** for compliance
- **Scalable storage** with Google's infrastructure
- **Version history** and file management
- **Quick recovery** from any location

## 🛠️ Maintenance & Monitoring

### Automated Tasks
- **Daily backups** at 2 AM UTC
- **Automatic cleanup** of old backups
- **Cloud synchronization** when enabled
- **Health monitoring** and error reporting

### Manual Maintenance
```bash
# Test backup system
POST /api/backup/test

# Manual cleanup
POST /api/backup/cleanup

# Update configuration
PUT /api/backup/config
{
  "schedule": "0 3 * * *",
  "keepLocalBackups": 14,
  "uploadToCloud": true
}
```

### Monitoring Checklist
- [ ] Daily backup completion
- [ ] Cloud upload success
- [ ] Storage space monitoring
- [ ] Error log review
- [ ] Backup integrity verification
- [ ] Restore testing (monthly)

## 🚨 Disaster Recovery

### Quick Recovery Process
1. **Stop the application**
2. **Download latest backup** from Google Drive
3. **Restore using API** or manual process
4. **Verify data integrity**
5. **Restart application**

### Recovery Time Objectives
- **Local backup restore**: 5-10 minutes
- **Cloud backup download**: 10-30 minutes (depending on size)
- **Full system recovery**: 15-45 minutes

### Backup Retention Policy
- **Local backups**: 7 days
- **Cloud backups**: 30 days
- **Critical backups**: 90 days (manual)
- **Archive backups**: 1 year (quarterly)

## 🔍 Troubleshooting

### Common Issues

#### Backup Creation Fails
```bash
# Check disk space
df -h

# Verify permissions
ls -la backend/backups/

# Test backup manually
POST /api/backup/test
```

#### Google Drive Upload Fails
```bash
# Check credentials
POST /api/backup/initialize-google

# Verify network connectivity
ping googleapis.com

# Check API quotas
# Visit Google Cloud Console
```

#### Restore Fails
```bash
# Verify backup integrity
# Check password correctness
# Ensure sufficient disk space
# Review error logs
```

### Log Locations
- **Application logs**: `backend/logs/`
- **Backup logs**: Console output
- **Error logs**: Application error handling

## 📊 Performance Considerations

### Backup Performance
- **Compression**: Level 9 (maximum)
- **Parallel processing**: Where possible
- **Incremental options**: Future enhancement
- **Deduplication**: Future enhancement

### Storage Optimization
- **Automatic cleanup**: Configurable retention
- **Compression ratios**: 60-80% typical
- **Cloud storage**: Cost-effective tiering
- **Local storage**: SSD recommended

## 🔮 Future Enhancements

### Planned Features
- **Incremental backups** for faster processing
- **Backup deduplication** for storage efficiency
- **Multiple cloud providers** (AWS S3, Azure)
- **Backup encryption** at rest
- **Real-time backup** monitoring dashboard
- **Automated restore** testing
- **Backup analytics** and reporting

### Integration Roadmap
- **Google Workspace** integration
- **Slack/Teams** notifications
- **Monitoring tools** integration (Prometheus, Grafana)
- **Compliance reporting** (GDPR, SOX)
- **Multi-region** backup distribution

## 📞 Support

For backup system issues:
1. Check the troubleshooting section
2. Review application logs
3. Test backup functionality
4. Contact system administrator
5. Escalate to development team

---

**Last Updated**: January 2024  
**Version**: 2.1.2  
**Compatibility**: Node.js 18+, SQLite 3.x 