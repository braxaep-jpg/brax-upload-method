@echo off
setlocal

cd /d "%~dp0"

echo Starting Brax Upload Method...
echo.

echo Building backend...
call npm.cmd --workspace backend run build
if errorlevel 1 (
  echo Backend build failed.
  pause
  exit /b 1
)

echo.
echo Opening backend on http://localhost:4000
start "Brax Backend" cmd /k "cd /d ""%~dp0"" && node backend\dist\server.js"

echo Opening frontend on http://localhost:5173
start "Brax Frontend" cmd /k "cd /d ""%~dp0"" && npm.cmd --workspace frontend run dev -- --host 127.0.0.1"

echo.
echo Use this URL:
echo   http://localhost:5173
echo.
echo Backend health:
echo   http://localhost:4000/api/health
echo.
pause
