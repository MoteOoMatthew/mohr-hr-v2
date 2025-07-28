# Environment Setup Guide

## Development Environment

### Required Environment Variables

Create a `.env` file in the `backend/` directory with the following settings:

```bash
# Development Environment Configuration
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
CORS_ORIGIN=*
SESSION_SECRET=dev-secret-key-change-in-production

# Disable CSP in development
DISABLE_CSP=true

# Database
DB_PATH=./database/mohr_hr_v2.db

# Backup settings
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=7
```

### Production Environment

For production deployment, use:

```bash
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
CORS_ORIGIN=https://mohr-hr-v2.onrender.com
SESSION_SECRET=your-secure-production-secret

# Enable CSP in production
DISABLE_CSP=false

# Database
DB_PATH=./database/mohr_hr_v2.db

# Backup settings
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
```

## Startup Commands

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## CSP Configuration

The application automatically configures Content Security Policy based on the environment:

- **Development**: CSP disabled to allow local API calls
- **Production**: CSP enabled with appropriate directives for security

## API Configuration

The frontend automatically detects the environment and configures API endpoints:

- **Local Development**: `http://localhost:5000`
- **Production**: `https://mohr-hr-v2.onrender.com` 