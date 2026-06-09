@echo off
title Taufeeq Portfolio Server
color 0A

echo.
echo  ============================================
echo   Taufeeq Ur Rehman - Portfolio Website
echo  ============================================
echo.
echo  [*] Starting server...
echo  [*] Please wait...
echo.

:: Check if node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js not found!
    echo  Please install from: https://nodejs.org
    echo.
    pause
    exit
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo  [*] First time setup - Installing packages...
    echo.
    npm install
    echo.
)

:: Open browser after 3 seconds
start "" timeout /t 3 /nobreak >nul & start "" "http://localhost:3000"

echo  ============================================
echo   Server running at: http://localhost:3000
echo   Admin panel at:    http://localhost:3000/admin
echo  ============================================
echo.
echo  Press Ctrl+C to stop the server
echo.

:: Start the server
npm run dev

pause
