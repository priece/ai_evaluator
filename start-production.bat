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

echo [1/5] Checking Node.js version...
node -v
echo.

REM Check FFmpeg
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo [Warning] FFmpeg not found, please install and add to PATH
    echo Download: https://ffmpeg.org/download.html
    pause
)

echo [2/5] Checking production build...
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

echo [3/5] Checking dependencies...
if not exist "node_modules" (
    echo [Info] node_modules not found, installing dependencies...
    call npm ci --only=production
    if errorlevel 1 (
        echo [Error] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [Done] Dependencies installed
) else (
    echo [Info] node_modules exists
)
echo.

echo [4/5] Creating required directories...
if not exist "data" mkdir data
if not exist "hls" mkdir hls
if not exist "logs" mkdir logs
if not exist "records" mkdir records
if not exist "audio" mkdir audio
echo [Done] Directory check complete
echo.

echo [5/5] Starting production server...
echo Access: http://localhost:3000
echo Press Ctrl+C to stop
echo.

set NODE_ENV=production

node server.js > output.log 2>&1

pause
