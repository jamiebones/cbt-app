# Multi-stage Dockerfile for Monolithic CBT Backend
FROM node:18-alpine AS base

# Install system dependencies for media processing
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    vips-dev \
    curl

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
WORKDIR /app

# Install nodemon for development
RUN npm install -g nodemon

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/data /app/logs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Start development server with hot reload
CMD ["nodemon", "src/server.js"]

# Production stage
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /app/uploads /app/data /app/logs && chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Start production server
CMD ["node", "src/server.js"]