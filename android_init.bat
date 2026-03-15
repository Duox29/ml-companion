@echo off
echo ======================================================
echo [1/4] Dang cai dat thu vien Capacitor...
call npm install @capacitor/core @capacitor/cli @capacitor/android

if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong the cai dat thu vien!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Dang khoi tao cau hinh Capacitor...
:: Neu file da ton tai thi bo qua buoc init
if not exist capacitor.config.ts (
    call npx cap init ml-companion com.mlcompanion.app --web-dir dist
) else (
    echo [OK] File capacitor.config.ts da ton tai.
)

echo.
echo [3/4] Dang them nen tang Android...
:: Neu thu muc android chua ton tai thi moi add
if not exist android (
    call npx cap add android
) else (
    echo [OK] Thu muc android da ton tai.
)

echo.
echo [4/4] Dang build Web va dong bo...
call npm run build
call npx cap sync android

echo.
echo ======================================================
echo [HOAN THANH] Da thiet lap xong moi truong Android!
echo Bay gio ban co the su dung build_apk.bat de tao APK.
echo ======================================================
pause
