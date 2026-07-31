@echo off
:: Change directory to where this batch file is located
cd /d "%~dp0"

:: Check if port 3001 is already in use
netstat -ano | findstr LISTENING | findstr :3001 >nul
if %ERRORLEVEL% equ 0 (
    echo GBK Bridge Server is already running.
    exit /b 0
)

:: Create logs directory if not exists
if not exist logs mkdir logs

:: Log startup
echo [%date% %time%] GBK Bridge Server starting on port 3001... >> logs\startup.log

:: Start node server in the background silently
start /B node server.js > logs\console.log 2>&1

:: Show Windows notification via PowerShell
powershell -Command "$wsh = New-Object -ComObject Wscript.Shell; $wsh.Popup('GBK Bridge Server started successfully', 3, 'GBKCRM Bridge', 64)"
