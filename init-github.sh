#!/bin/bash
# Initialize Git and push to GitHub
# Run this script to set up your GitHub repository

echo "🚀 Initializing Brax Upload Method repository..."
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're already a git repo
if [ -d .git ]; then
    echo "⚠️  This directory is already a Git repository."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "📦 Initializing new Git repository..."
    git init
    git config user.email "you@example.com"
    git config user.name "Your Name"
fi

# Add all files
echo "📝 Adding all files..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Brax Upload Method MVP"

# Get GitHub username
read -p "Enter your GitHub username: " GITHUB_USER
read -p "Enter repository name (default: brax-upload-method): " REPO_NAME
REPO_NAME=${REPO_NAME:-brax-upload-method}

# Add remote
REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"
echo "🔗 Adding remote: $REPO_URL"
git remote add origin $REPO_URL || git remote set-url origin $REPO_URL

# Show status
echo ""
echo "📋 Repository status:"
git status
echo ""

# Ask to push
read -p "Push to GitHub now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Pushing to GitHub..."
    git branch -M main
    git push -u origin main
    echo "✅ Successfully pushed to GitHub!"
    echo "🎉 Repository: $REPO_URL"
else
    echo "⏭️  Skipping push. Run manually when ready:"
    echo "   git branch -M main"
    echo "   git push -u origin main"
fi

echo ""
echo "✨ Done! Next steps:"
echo "1. Go to https://github.com/$GITHUB_USER/$REPO_NAME/settings"
echo "2. Add topics: tiktok, video-optimization, ffmpeg, typescript, react"
echo "3. See RELEASE_CHECKLIST.md for deployment instructions"
echo ""
