@echo off
title CyberBOT v1.0.0 (Dev)
echo ========================================
echo    CyberBOT v1.0.0 - Gelistirme Modu
echo ========================================
echo.
cd /d "%~dp0"

echo [1/3] Prisma generate calistiriliyor...
call npx prisma generate
if %ERRORLEVEL% neq 0 (
    echo HATA: Prisma generate basarisiz!
    pause
    exit /b 1
)

echo [2/3] Build aliniyor...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo HATA: Build basarisiz!
    pause
    exit /b 1
)

echo [3/3] Bot baslatiliyor...
echo.
node dist/index.js
pause
