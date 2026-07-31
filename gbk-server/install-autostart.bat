@echo off
:: Check for Administrator privileges
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Requesting administrative privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Change directory to where this batch file is located
cd /d "%~dp0"

echo Installing GBK Bridge Server Auto-Start shortcut...

:: Create shortcut in the Windows Startup folder pointing to start-bridge.bat
powershell -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut(\"$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\GBKBridge.lnk\"); $s.TargetPath = \"%~dp0start-bridge.bat\"; $s.WorkingDirectory = \"%~dp0\"; $s.Save();"

echo.
echo ✅ GBK Bridge Server will now start automatically on Windows login.
powershell -Command "[System.Windows.MessageBox]::Show('GBK Bridge Server will now start automatically on Windows login.', 'GBKCRM Installation Success', 'OK', 'Information')"
