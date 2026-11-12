@echo off
setlocal

cd /d "%~dp0"

start "OrderManagement Server" cmd /k "npm start"
start "Opening OrderManagement" powershell -NoProfile -Command "Start-Sleep -Seconds 8; Start-Process 'http://localhost:3000/'"

endlocal