@echo off
echo.
echo ====================================
echo     PROJECT TRACKER LAUNCHER
echo ====================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://python.org
    echo.
    pause
    exit /b 1
)

echo ✅ Python detected
echo 🚀 Starting Project Tracker Server...
echo.

:: Change to script directory
cd /d "%~dp0"

:: Start the server
python server.py

pause
