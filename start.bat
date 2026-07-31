@echo off
echo Killing any existing node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo.
echo Starting TransitOps Backend on port 5000...
start "TransitOps Backend" cmd /k "cd /d d:\transport\TransitOps\backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting TransitOps Frontend on port 5173...
start "TransitOps Frontend" cmd /k "cd /d d:\transport\TransitOps\frontend && npm run dev"

echo.
echo Both servers started!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo DO NOT run npm start or npm run dev manually in other terminals.
