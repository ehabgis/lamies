@echo off
title Smart Educational Map - V3
cd /d "%~dp0"
where npm >nul 2>&1
if errorlevel 1 (
  echo Please install Node.js LTS from https://nodejs.org and reopen this file.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
  echo Installing project dependencies...
  call npm ci
  if errorlevel 1 (
    echo Installation failed. Copy the error message for support.
    pause
    exit /b 1
  )
)
call npm run dev -- --port 3010 --open
pause
