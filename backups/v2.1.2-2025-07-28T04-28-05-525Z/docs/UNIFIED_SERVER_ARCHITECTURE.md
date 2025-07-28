# Unified Server Architecture - MOHR HR V2

## Overview

The MOHR HR V2 system has been redesigned to use a **unified server architecture** that eliminates the need for separate frontend and backend servers. This consolidation provides better deployment simplicity, improved performance, and easier maintenance.

## Architecture Benefits

### ✅ **Simplified Deployment**
- Single server to deploy and manage
- No CORS configuration needed
- Reduced infrastructure complexity
- Easier containerization and cloud deployment

### ✅ **Improved Performance**
- No network overhead between frontend and backend
- Faster API calls (no cross-origin requests)
- Reduced latency for user interactions
- Better caching strategies

### ✅ **Enhanced Security**
- Single entry point for all requests
- Unified authentication and session management
- Easier to implement security headers
- Reduced attack surface

### ✅ **Better Development Experience**
- Hot Module Replacement (HMR) still works in development
- Single command to start the entire application
- Easier debugging and logging
- Consistent environment across development and production

## How It Works

### Development Mode
```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Server (Port 5000)               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   API Routes    │  │  Proxy Middleware│  │  Vite Dev    │ │
│  │   (/api/*)      │  │  (/)            │  │  Server      │ │
│  │                 │  │                 │  │  (Port 3001) │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

1. **Backend Server** starts on port 5000
2. **Vite Dev Server** starts on port 3001 (for HMR)
3. **Proxy Middleware** forwards non-API requests to Vite
4. **API Routes** handle all `/api/*` requests directly
5. **Hot Module Replacement** works seamlessly through proxy

### Production Mode
```
┌─────────────────────────────────────────────────────────────┐
│                    Unified Server (Port 5000)               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   API Routes    │  │  Static Files   │  │  React App   │ │
│  │   (/api/*)      │  │  (/)            │  │  (Built)     │ │
│  │                 │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

1. **Frontend** is built to `frontend/dist/`
2. **Build files** are copied to `backend/public/`
3. **Backend Server** serves both API and static files
4. **Single port** (5000) serves the entire application

## File Structure

```
MOHR/
├── backend/
│   ├── server.js              # Unified server (API + Frontend)
│   ├── public/                # Production frontend files
│   ├── routes/                # API routes
│   └── package.json           # Backend dependencies
├── frontend/
│   ├── src/                   # React source code
│   ├── dist/                  # Build output (dev)
│   └── package.json           # Frontend dependencies
├── scripts/
│   ├── start-dev.ps1          # Development startup
│   ├── build-production.ps1   # Production build
│   └── stop-dev.ps1           # Stop all servers
└── package.json               # Root scripts
```

## Usage

### Development
```bash
# Start unified development environment
npm run dev

# Access application
# Main App: http://localhost:5000
# API Health: http://localhost:5000/api/health
# Vite Dev: http://localhost:3001 (for HMR)
```

### Production
```bash
# Build for production
npm run build

# Start production server
npm run start:production

# Access application
# Main App: http://localhost:5000
# API Health: http://localhost:5000/api/health
```

### Legacy Mode (Separate Servers)
```bash
# If you need separate servers for any reason
npm run dev:legacy
```

## Configuration

### Environment Variables

```env
# Server Configuration
PORT=5000
HOST=0.0.0.0
NODE_ENV=development|production

# CORS (only needed for external API access)
CORS_ORIGIN=*

# Session
SESSION_SECRET=your-secret-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=/auth/google/callback
```

### Proxy Configuration

The proxy middleware automatically handles:
- **API Routes**: `/api/*` → Backend handlers
- **OAuth Routes**: `/auth/*` → Backend handlers  
- **Static Files**: `/*` → Vite dev server (dev) or static files (prod)

## Migration from Separate Servers

### What Changed
1. **Single Server**: Backend now serves frontend
2. **Proxy Middleware**: Added for development mode
3. **Build Process**: Frontend built and copied to backend
4. **Startup Scripts**: Updated for unified approach

### What Stayed the Same
1. **API Endpoints**: All `/api/*` routes unchanged
2. **Frontend Code**: React components and logic unchanged
3. **Database**: SQLite database unchanged
4. **Authentication**: JWT and session handling unchanged

## Deployment

### Local Production
```bash
npm run build
npm run start:production
```

### Docker Deployment
```dockerfile
# Build frontend
FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build backend with frontend
FROM node:18 AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./public

# Production image
FROM node:18-alpine
WORKDIR /app
COPY --from=backend-builder /app/backend ./
EXPOSE 5000
CMD ["npm", "start"]
```

### Cloud Deployment (Render, Heroku, etc.)
- Single service deployment
- No need for separate frontend/backend services
- Simplified environment variables
- Better resource utilization

## Troubleshooting

### Development Issues

**Vite Dev Server Not Starting**
```bash
# Check if port 3001 is free
netstat -ano | findstr ":3001"

# Kill processes if needed
taskkill /F /IM node.exe
```

**Proxy Not Working**
```bash
# Check if http-proxy-middleware is installed
cd backend && npm install http-proxy-middleware
```

### Production Issues

**Frontend Not Loading**
```bash
# Check if build files exist
ls backend/public/

# Rebuild if needed
npm run build
```

**API Routes Not Working**
```bash
# Check server logs
cd backend && npm start

# Verify routes are loaded
curl http://localhost:5000/api/health
```

## Performance Considerations

### Development
- **HMR**: Still works through proxy
- **API Calls**: Slightly faster (no CORS)
- **Memory**: Slightly higher (proxy overhead)

### Production
- **Static Files**: Served directly by Express
- **API Calls**: Direct (no network overhead)
- **Memory**: Lower (no proxy)
- **Caching**: Better (single server)

## Security Benefits

1. **Single Entry Point**: All requests go through one server
2. **Unified Headers**: Security headers applied consistently
3. **Session Management**: Centralized authentication
4. **Rate Limiting**: Applied to all routes
5. **CORS**: Not needed for same-origin requests

## Future Enhancements

1. **Service Worker**: Can be served from same origin
2. **PWA Features**: Better offline support
3. **Microservices**: Can still be added later if needed
4. **Load Balancing**: Single service to scale
5. **Monitoring**: Unified logging and metrics

---

This unified architecture provides a modern, efficient, and maintainable solution for the MOHR HR V2 system while preserving all existing functionality and improving the overall user experience. 