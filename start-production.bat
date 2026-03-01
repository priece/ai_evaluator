@echo off
chcp 65001 >nul
echo ==========================================
echo    AI Evaluator 生产环境启动脚本
echo ==========================================
echo.

REM 检查 Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

echo [1/4] 检查 Node.js 版本...
node -v
echo.

REM 检查 FFmpeg
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo [警告] 未检测到 FFmpeg，请确保 FFmpeg 已安装并添加到 PATH
    echo 下载地址: https://ffmpeg.org/download.html
    pause
)

echo [2/4] 检查生产构建...
if not exist ".next" (
    echo [信息] 未找到构建文件，开始构建...
    call npm run build
    if errorlevel 1 (
        echo [错误] 构建失败
        pause
        exit /b 1
    )
) else (
    echo [信息] 构建文件已存在
)
echo.

echo [3/4] 创建必要目录...
if not exist "data" mkdir data
if not exist "hls" mkdir hls
if not exist "logs" mkdir logs
echo [完成] 目录检查完成
echo.

echo [4/4] 启动生产服务器...
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

set NODE_ENV=production
node server.js

pause
