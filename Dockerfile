# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install ffmpeg
RUN apk add --no-cache ffmpeg

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build backend
RUN npm --workspace backend run build

# Build frontend
RUN npm --workspace frontend run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install ffmpeg
RUN apk add --no-cache ffmpeg

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies
RUN npm install --production

# Copy built application
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 4000

# Start backend
CMD ["node", "backend/dist/server.js"]
