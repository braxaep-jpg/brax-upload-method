# Dockerfile for Frontend (Vite + React)
FROM node:18-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install simple HTTP server
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

ENV PORT=5173

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
