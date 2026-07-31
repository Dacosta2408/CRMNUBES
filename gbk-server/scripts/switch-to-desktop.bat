@echo off
cd /d "%~dp0"
cd ..

echo Restoring configuration from .env.backup...
if exist ".env.backup" (
    copy /Y ".env.backup" ".env" >nul 2>&1
) else (
    echo No backup found, creating default development configuration...
    (
    echo GBK_ROOT_PATH=C:\Users\vdaco\Desktop\gbk-crm
    echo GBK_BRIDGE_SECRET=gbk-local-secret-2024
    echo GBK_PORT=3001
    echo NODE_ENV=development
    ) > ".env"
)

echo Restarting GBK Bridge Server...
call "stop-bridge.bat" >nul 2>&1
call "start-bridge.bat" >nul 2>&1

:: Log switch
if not exist "logs" mkdir "logs"
echo [%date% %time%] Switched configuration to Desktop (Development) >> "logs\startup.log"

echo.
echo ✅ GBK Bridge Server now pointing to Desktop test folder
