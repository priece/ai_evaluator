@echo off
chcp 65001 >nul
echo ==========================================
echo    AI Evaluator Production Startup
echo ==========================================
echo.

REM Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo [Error] Node.js not found, please install Node.js 18+
    pause
    exit /b 1
)

echo [1/4] Checking Node.js version...
node -v
echo.

REM Check FFmpeg
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo [Warning] FFmpeg not found, please install and add to PATH
    echo Download: https://ffmpeg.org/download.html
    pause
)

echo [2/4] Checking production build...
if not exist ".next" (
    echo [Info] Build files not found, starting build...
    call npm run build
    if errorlevel 1 (
        echo [Error] Build failed
        pause
        exit /b 1
    )
) else (
    echo [Info] Build files exist
)
echo.

echo [3/4] Creating required directories...
if not exist "data" mkdir data
if not exist "hls" mkdir hls
if not exist "logs" mkdir logs
if not exist "records" mkdir records
echo [Done] Directory check complete
echo.

echo [4/4] Starting production server...
echo Access: http://localhost:3000
echo Press Ctrl+C to stop
echo.

set NODE_ENV=production

node server.js

pause
