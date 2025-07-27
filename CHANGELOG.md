# Changelog

All notable changes to the MOHR HR System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-07-27

### Added
- **Dark Mode Support**: Complete dark theme implementation across the entire application
  - Dark gray and blue color scheme
  - Theme toggle button in the top navigation bar
  - Automatic theme persistence using localStorage
  - System preference detection for initial theme
- **Version Management System**: 
  - Version display in bottom-right corner of the application
  - Automatic version synchronization between package.json and frontend
  - Version update scripts for patch, minor, and major releases
- **Enhanced UI Components**:
  - Dark mode support for all form inputs, buttons, and cards
  - Updated scrollbar styling for dark mode
  - Improved contrast and accessibility in dark theme
- **Backup System**:
  - Automated backup script for version releases
  - Comprehensive backup of source code and configuration
  - Backup metadata with version information and changelog

### Changed
- **Perfect Forward Secrecy (PFS)**: Fixed implementation to use proper PBKDF2-based session key generation
- **Theme Context**: Added React context for global theme management
- **Tailwind Configuration**: Updated to support dark mode with class-based switching
- **CSS Components**: Enhanced all component classes with dark mode variants
- **Layout Component**: Added theme toggle button and dark mode styling
- **Login Page**: Updated with dark mode support for all form elements

### Fixed
- **PFS Key Derivation**: Resolved ECDH implementation issues that were causing E2EE initialization failures
- **Session Key Rotation**: Fixed cryptographic key generation for Perfect Forward Secrecy
- **E2EE Initialization**: Resolved issues preventing E2EE service initialization after login

### Technical Details
- **Dark Mode Implementation**: Uses Tailwind CSS `dark:` prefix with class-based switching
- **Version Sync**: Automated script that updates frontend version config when package.json changes
- **Theme Persistence**: Saves user preference in localStorage and respects system preferences
- **Backup Automation**: Creates timestamped backups with metadata for each version release

### Security
- **E2EE Improvements**: Enhanced Perfect Forward Secrecy with proper cryptographic implementation
- **Session Management**: Improved session key rotation and management
- **Theme Security**: No sensitive data stored in theme preferences

## [2.0.0] - 2025-07-27

### Added
- **End-to-End Encryption (E2EE)**: Complete client-side encryption system
- **Perfect Forward Secrecy (PFS)**: Session-based encryption key rotation
- **Deniable Encryption**: Hidden data compartments with cryptographic signatures
- **Advanced Security Features**: Comprehensive security dashboard and management
- **Modern React Architecture**: Updated to latest React patterns and best practices
- **Enhanced UI/UX**: Improved user interface with Tailwind CSS
- **Google OAuth Integration**: Secure authentication with Google services
- **Comprehensive Testing**: Full test suite for E2EE functionality

### Changed
- **Database Schema**: Updated to support encrypted fields and E2EE metadata
- **API Integration**: Enhanced backend routes to handle encrypted data
- **Authentication Flow**: Improved login and registration with E2EE support
- **Component Architecture**: Refactored to modern React patterns

### Security
- **Zero-Knowledge Architecture**: Server cannot decrypt sensitive data
- **Client-Side Encryption**: All encryption/decryption happens in the browser
- **Field-Level Security**: Different encryption levels for different data types
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Encryption Algorithm**: AES-GCM 256-bit
- **Integrity Protection**: HMAC-SHA256 signatures

---

## Version Management

### Available Scripts
- `npm run version:patch` - Increment patch version (2.1.0 → 2.1.1)
- `npm run version:minor` - Increment minor version (2.1.0 → 2.2.0)
- `npm run version:major` - Increment major version (2.1.0 → 3.0.0)
- `npm run update-version` - Sync frontend version with package.json
- `npm run backup` - Create comprehensive backup of current version

### Version Display
The current version is displayed in the bottom-right corner of the application and automatically updates when the version is changed using the npm scripts. 