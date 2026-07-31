@echo off
:: Change directory to where this batch file is located
cd /d "%~dp0"

:: Create logs directory if not exists
if not exist logs mkdir logs

:: Find the PID on port 3001 and kill it
set found=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :3001') do (
    echo Killing process PID %%a running on port 3001...
    taskkill /F /PID %%a >nul 2>&1
    set found=1
)

:: Log shutdown
echo [%date% %time%] GBK Bridge Server stopped >> logs\startup.log

:: Show Windows notification via PowerShell
powershell -Command "$wsh = New-Object -ComObject Wscript.Shell; $wsh.Popup('GBK Bridge Server stopped', 3, 'GBKCRM Bridge', 64)"
