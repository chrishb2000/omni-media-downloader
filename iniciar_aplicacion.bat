@echo off
title OmniMedia Downloader Pro Launcher
cls
echo ========================================================
echo         OmniMedia Downloader Pro - Initializer
echo ========================================================
echo.

if exist .git (
    echo [INFO] Checking for latest updates from repository...
    git pull origin main >nul 2>&1
)

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this system.
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b
)

if not exist node_modules (
    echo [INFO] First run detected. Installing dependencies automatically...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install npm dependencies.
        pause
        exit /b
    )
)

echo [INFO] Starting OmniMedia Downloader Pro...
echo.
call npm start
