@echo off
echo [1/4] Dang build ma nguon Web...
call npm run build

:: Copy index.html to bubbleWebView.html so the overlay works natively without redirect
copy /Y dist\index.html dist\bubbleWebView.html

if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Build Web that bai!
    pause
    exit /b %ERRORLEVEL%
)

echo [2/4] Dang dong bo voi Capacitor Android...
call npx cap sync android

if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Sync Capacitor that bai!
    pause
    exit /b %ERRORLEVEL%
)

echo [3/4] Dang clean va build APK...
cd android
call gradlew.bat clean assembleDebug

if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Build APK that bai!
    cd ..
    pause
    exit /b %ERRORLEVEL%
)

cd ..
echo [4/4] Dang go bo ban cu va cai dat APK moi...
"C:\SDK\platform-tools\adb.exe" uninstall com.mlcompanion.app
"C:\SDK\platform-tools\adb.exe" install -r "android\app\build\outputs\apk\debug\app-debug.apk"

if %ERRORLEVEL% NEQ 0 (
    echo [CANH BAO] Cai dat APK that bai (co the do khong co thiet bi ket noi).
) else (
    echo [OK] Da cai dat va cap nhat thanh cong vao thiet bi.
)

echo.
echo ======================================================
echo [HOAN THANH] Ung dung da san sang!
echo ======================================================
pause
