@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is needed to launch Moss ^& Ember.
  echo Install Node.js, then open this launcher again.
  pause
  exit /b 1
)
node server.mjs --open
pause
