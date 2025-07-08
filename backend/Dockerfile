# backend/Dockerfile (продакшн)
FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "start"]

# backend/Dockerfile.dev (разработка)
FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Install development tools
RUN npm install -g nodemon

# Expose port
EXPOSE 5000

# Start in development mode
CMD ["npm", "run", "dev"]