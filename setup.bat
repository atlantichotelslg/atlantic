@echo off
echo ======================================
echo Atlantic Hotel Receipt System Setup
echo ======================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js 18.x or higher.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo √ Node.js is installed
node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X npm is not installed.
    pause
    exit /b 1
)

echo √ npm is installed
npm --version
echo.

echo Installing dependencies...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo √ Installation completed successfully!
    echo.
    echo ======================================
    echo Quick Start Commands:
    echo ======================================
    echo.
    echo Run as Web App:
    echo   npm run dev
    echo   Then open http://localhost:3000
    echo.
    echo Run as Desktop App:
    echo   npm run electron:dev
    echo.
    echo Default Credentials:
    echo   Admin: admin / admin123
    echo   Receptionist: receptionist / recept123
    echo.
    echo ======================================
) else (
    echo.
    echo X Installation failed. Please check the errors above.
)

pause