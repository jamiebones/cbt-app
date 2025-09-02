# Simplified Dockerfile for Next.js Frontend
FROM node:22.13.0-alpine

# Install dependencies for better compatibility
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Note: Source code is mounted via volume in docker-compose.yml
# This allows for hot reloading during development

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Start development server
CMD ["npm", "run", "dev"]