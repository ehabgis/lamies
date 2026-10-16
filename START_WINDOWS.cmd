@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS, then reopen this window.
  pause
  exit /b 1
)
node -e "if(!(Number(process.versions.node.split('.')[0])>=24))process.exit(1)"
if errorlevel 1 (
  echo Node.js 24 or newer is required.
  pause
  exit /b 1
)
set NEED_INSTALL=
if not exist node_modules\.bin\vite.cmd set NEED_INSTALL=1
rem Newer versions add libraries (e.g. maplibre-gl for the 3D view).
if not exist node_modules\maplibre-gl\package.json set NEED_INSTALL=1
if defined NEED_INSTALL (
  call npm ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm run dev -- --open
pause
