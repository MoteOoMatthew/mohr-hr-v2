# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm run install:all

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 10000

# Start the application
CMD ["npm", "start"] 