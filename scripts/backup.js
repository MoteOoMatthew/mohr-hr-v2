#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get current timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, '..', 'backups', `v2.1.2-${timestamp}`);

// Create backup directory
if (!fs.existsSync(path.join(__dirname, '..', 'backups'))) {
  fs.mkdirSync(path.join(__dirname, '..', 'backups'));
}
fs.mkdirSync(backupDir, { recursive: true });

// Directories to backup
const dirsToBackup = [
  'frontend/src',
  'backend',
  'docs',
  'scripts'
];

// Files to backup
const filesToBackup = [
  'package.json',
  'package-lock.json',
  'README.md',
  'LICENSE',
  'render.yaml',
  'Dockerfile'
];

console.log('🔄 Creating backup...');

// Backup directories
dirsToBackup.forEach(dir => {
  const sourcePath = path.join(__dirname, '..', dir);
  const destPath = path.join(backupDir, dir);
  
  if (fs.existsSync(sourcePath)) {
    // Create destination directory
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    
    // Copy directory recursively
    copyDir(sourcePath, destPath);
    console.log(`✅ Backed up ${dir}`);
  }
});

// Backup files
filesToBackup.forEach(file => {
  const sourcePath = path.join(__dirname, '..', file);
  const destPath = path.join(backupDir, file);
  
  if (fs.existsSync(sourcePath)) {
    // Create destination directory
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    
    // Copy file
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Backed up ${file}`);
  }
});

// Create backup info file
const backupInfo = {
  version: '2.1.2',
  timestamp: new Date().toISOString(),
  features: [
    'End-to-End Encryption (E2EE)',
    'Perfect Forward Secrecy (PFS)',
    'Deniable Encryption',
    'Dark Mode Support',
    'Advanced Security Features',
    'Version Management System'
  ],
  changes: [
    'Added dark mode theme support',
    'Implemented version display system',
    'Fixed PFS implementation',
    'Added theme toggle in navigation',
    'Updated all components for dark mode',
    'Added automatic version sync script',
    'Fixed Dashboard card styling for better theme contrast',
    'Improved visual consistency across light and dark modes'
  ]
};

fs.writeFileSync(
  path.join(backupDir, 'backup-info.json'),
  JSON.stringify(backupInfo, null, 2)
);

console.log(`✅ Backup created at: ${backupDir}`);
console.log(`📋 Backup info: ${path.join(backupDir, 'backup-info.json')}`);

// Helper function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
} 