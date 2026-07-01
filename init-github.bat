@echo off
REM Initialize Git and push to GitHub (Windows batch version)
REM Run this script to set up your GitHub repository

echo.
echo 🚀 Initializing Brax Upload Method repository...
echo.

REM Check if git is installed
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Git is not installed. Please install Git first.
    pause
    exit /b 1
)

REM Initialize git if needed
if exist .git (
    echo ⚠️  This directory is already a Git repository.
) else (
    echo 📦 Initializing new Git repository...
    git init
    git config user.email "you@example.com"
    git config user.name "Your Name"
)

echo 📝 Adding all files...
git add .

echo 💾 Creating initial commit...
git commit -m "Initial commit: Brax Upload Method MVP"

setlocal enabledelayedexpansion

set /p GITHUB_USER="Enter your GitHub username: "
set /p REPO_NAME="Enter repository name (default: brax-upload-method): "

if "%REPO_NAME%"=="" set REPO_NAME=brax-upload-method

set REPO_URL=https://github.com/%GITHUB_USER%/%REPO_NAME%.git

echo 🔗 Adding remote: %REPO_URL%
git remote add origin %REPO_URL% 2>nul || git remote set-url origin %REPO_URL%

echo.
echo 📋 Repository status:
git status

echo.
set /p PUSH="Push to GitHub now? (y/n): "

if /i "%PUSH%"=="y" (
    echo 🚀 Pushing to GitHub...
    git branch -M main
    git push -u origin main
    echo ✅ Successfully pushed to GitHub!
    echo 🎉 Repository: %REPO_URL%
) else (
    echo ⏭️  Skipping push. Run manually when ready:
    echo    git branch -M main
    echo    git push -u origin main
)

echo.
echo ✨ Done! Next steps:
echo 1. Go to https://github.com/%GITHUB_USER%/%REPO_NAME%/settings
echo 2. Add topics: tiktok, video-optimization, ffmpeg, typescript, react
echo 3. See RELEASE_CHECKLIST.md for deployment instructions
echo.

pause
