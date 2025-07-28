# Multi-stage build for MOHR HR V2 Unified Server
FROM node:18-alpine AS frontend-builder

# Set working directory
WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Copy frontend source code
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# Backend stage
FROM node:18-alpine AS backend-builder

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Copy backend source code
COPY backend/ ./backend/

# Copy frontend build to backend public directory
COPY --from=frontend-builder /app/frontend/dist ./public

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend from builder stage (including all files and node_modules)
COPY --from=backend-builder /app/backend/ ./

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000

# Expose port
EXPOSE 10000

# Start the unified server
CMD ["npm", "start"] 