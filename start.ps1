# Kill any existing node processes
Write-Host "Stopping any existing servers..." -ForegroundColor Yellow
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Start Backend
Write-Host "Starting Backend (port 5000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd d:\transport\TransitOps\backend; npm run dev'

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend (port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd d:\transport\TransitOps\frontend; npm run dev'

Write-Host ""
Write-Host "Both servers started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Green
