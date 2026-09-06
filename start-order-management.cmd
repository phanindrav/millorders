@echo off
setlocal

cd /d "%~dp0"

start "OrderManagement API" cmd /k "npm start"
start "OrderManagement Frontend" cmd /k "npm run dev"
start "Opening OrderManagement" powershell -NoProfile -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:5173/'"

endlocal