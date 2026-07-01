#!/bin/bash
# Deploy script for production

echo "🚀 Deploying Brax Upload Method..."

# Build frontend
echo "📦 Building frontend..."
npm --workspace frontend run build

# Build backend
echo "📦 Building backend..."
npm --workspace backend run build

# Optional: Push to Docker Hub
if [ -n "$DOCKER_USERNAME" ]; then
  echo "🐳 Building Docker image..."
  docker build -t brax-upload-method:latest .
  docker tag brax-upload-method:latest $DOCKER_USERNAME/brax-upload-method:latest
  docker push $DOCKER_USERNAME/brax-upload-method:latest
fi

echo "✅ Deployment complete!"
