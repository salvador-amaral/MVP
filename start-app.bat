@echo off
title PrepApp - Dev Server
cd /d "%~dp0"

if not exist node_modules (
    echo Installing dependencies...
    call npm install
)

echo.
echo Starting PrepApp at http://localhost:3000 ...
echo Press Ctrl+C to stop.
echo.
call npm run dev

echo.
echo The server stopped.
pause
