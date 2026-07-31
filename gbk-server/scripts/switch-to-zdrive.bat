@echo off
cd /d "%~dp0"
cd ..

echo Backing up current .env to .env.backup...
copy /Y ".env" ".env.backup" >nul 2>&1

echo Switching configuration to production (.env.production)...
copy /Y ".env.production" ".env" >nul 2>&1

echo Restarting GBK Bridge Server...
call "stop-bridge.bat" >nul 2>&1
call "start-bridge.bat" >nul 2>&1

:: Log switch
if not exist "logs" mkdir "logs"
echo [%date% %time%] Switched configuration to Z Drive (Production) >> "logs\startup.log"

echo.
echo ✅ GBK Bridge Server now pointing to Z Drive
