@echo off
title FFC & Pizza POS - Starting...
color 0A

echo.
echo  ========================================
echo    FFC ^& Pizza POS - Starting up...
echo  ========================================
echo.

:: Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js is not installed!
    echo  Please install Node.js from https://nodejs.org
    pause
    exit
)

:: Go to the POS folder
cd /d C:\RestaurantPOS

:: Check if print-server.js exists
if not exist print-server.js (
    color 0C
    echo  [ERROR] print-server.js not found in C:\RestaurantPOS
    echo  Make sure all files are in C:\RestaurantPOS
    pause
    exit
)

echo  [OK] Node.js found
echo  [OK] POS files found
echo.
echo  Starting print server...
echo.

:: Start the print server in background
start "FFC POS Print Server" cmd /k "cd /d C:\RestaurantPOS && node print-server.js"

:: Wait 3 seconds for server to start
echo  Waiting for server to start...
timeout /t 3 /nobreak >nul

:: Open POS in Chrome
echo  Opening POS in Chrome...
start chrome "http://localhost:6789/restaurant_pos_v2_escpos_storage.html"

echo.
echo  ========================================
echo    FFC ^& Pizza POS is running!
echo    http://localhost:6789
echo  ========================================
echo.
echo  * Keep the Print Server window open
echo  * Close this window anytime
echo.
timeout /t 5 /nobreak >nul
exit
