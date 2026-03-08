@echo off
chcp 65001 >nul
echo ==========================================
echo    AI Evaluator Production Package
echo ==========================================
echo.

set PACKAGE_NAME=ai-evaluator-production
set PACKAGE_DIR=%PACKAGE_NAME%

echo [1/6] Cleaning old files...
if exist %PACKAGE_DIR% rmdir /S /Q %PACKAGE_DIR%
echo [Done]
echo.

echo [2/6] Building production...
call npm run build
if errorlevel 1 (
    echo [Error] Build failed
    pause
    exit /b 1
)
echo [Done]
echo.

echo [3/6] Creating directory structure...
mkdir %PACKAGE_DIR%
mkdir %PACKAGE_DIR%\public
mkdir %PACKAGE_DIR%\public\background
mkdir %PACKAGE_DIR%\public\motions
mkdir %PACKAGE_DIR%\src\lib
mkdir %PACKAGE_DIR%\data
mkdir %PACKAGE_DIR%\hls
mkdir %PACKAGE_DIR%\logs
mkdir %PACKAGE_DIR%\records
mkdir %PACKAGE_DIR%\audio
echo [Done]
echo.

echo [4/6] Copying build files...
xcopy /E /I /Q .next %PACKAGE_DIR%\.next\
echo [Done]
echo.

echo [5/6] Copying static assets...
xcopy /E /I /Q public\* %PACKAGE_DIR%\public\
echo [Done]
echo.

echo [6/6] Copying config and source files...
copy server.js %PACKAGE_DIR%\
copy package.json %PACKAGE_DIR%\
copy package-lock.json %PACKAGE_DIR%\
copy .env.production %PACKAGE_DIR%\
copy next.config.js %PACKAGE_DIR%\
copy config.json %PACKAGE_DIR%\
copy start-production.bat %PACKAGE_DIR%\
copy ecosystem.config.js %PACKAGE_DIR%\
copy deploy.md %PACKAGE_DIR%\
copy database.init.json %PACKAGE_DIR%\data\database.json
xcopy /E /I /Q src\lib\* %PACKAGE_DIR%\src\lib\
echo [Done]
echo.

echo ==========================================
echo    Package Complete!
echo ==========================================
echo.
echo Package directory: %PACKAGE_DIR%
echo.
echo Deploy steps:
echo   1. Copy %PACKAGE_DIR% to server
echo   2. Run: npm ci --only=production
echo   3. Run: start-production.bat
echo.
pause
