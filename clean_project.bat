@echo off
echo Cleaning project temp directories...

if exist "records" (
    echo Cleaning records...
    rmdir /s /q "records"
    echo records cleaned
) else (
    echo records not found
)

if exist "logs" (
    echo Cleaning logs...
    rmdir /s /q "logs"
    echo logs cleaned
) else (
    echo logs not found
)

if exist "hls" (
    echo Cleaning hls...
    rmdir /s /q "hls"
    echo hls cleaned
) else (
    echo hls not found
)

if exist "audio" (
    echo Cleaning audio...
    rmdir /s /q "audio"
    echo audio cleaned
) else (
    echo audio not found
)

if exist "ai-evaluator-production" (
    echo Cleaning ai-evaluator-production...
    rmdir /s /q "ai-evaluator-production"
    echo ai-evaluator-production cleaned
) else (
    echo ai-evaluator-production not found
)

if exist ".next" (
    echo Cleaning .next...
    rmdir /s /q ".next"
    echo .next cleaned
) else (
    echo .next not found
)

echo.
echo Done!
pause
