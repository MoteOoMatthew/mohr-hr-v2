# MOHR HR V2 Development Startup Script - Unified Server
Write-Host "Starting MOHR HR V2 Development Environment (Unified Server)..." -ForegroundColor Green

# Kill all Node.js processes first
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe | Out-Null
Start-Sleep -Seconds 2

# Kill processes on port 5000
Write-Host "Checking for processes on port 5000..." -ForegroundColor Yellow
$processes = netstat -ano | findstr ":5000 " | findstr "LISTENING"
if ($processes) {
    Write-Host "Found processes using port 5000. Terminating..." -ForegroundColor Yellow
    foreach ($process in $processes) {
        $parts = $process -split '\s+'
        $pid = $parts[-1]
        if ($pid -and $pid -ne "0") {
            taskkill /PID $pid /F | Out-Null
            Write-Host "Terminated process PID: $pid" -ForegroundColor Green
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "Port 5000 is free" -ForegroundColor Green
}

# Kill processes on port 3001 (Vite dev server)
Write-Host "Checking for processes on port 3001..." -ForegroundColor Yellow
$processes = netstat -ano | findstr ":3001 " | findstr "LISTENING"
if ($processes) {
    Write-Host "Found processes using port 3001. Terminating..." -ForegroundColor Yellow
    foreach ($process in $processes) {
        $parts = $process -split '\s+'
        $pid = $parts[-1]
        if ($pid -and $pid -ne "0") {
            taskkill /PID $pid /F | Out-Null
            Write-Host "Terminated process PID: $pid" -ForegroundColor Green
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "Port 3001 is free" -ForegroundColor Green
}

# Install backend dependencies if needed
Write-Host "Checking backend dependencies..." -ForegroundColor Yellow
Set-Location "backend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    npm install
}
Set-Location ".."

# Install frontend dependencies if needed
Write-Host "Checking frontend dependencies..." -ForegroundColor Yellow
Set-Location "frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    npm install
}
Set-Location ".."

# Start Vite dev server in background (for development)
Write-Host "Starting Vite Development Server..." -ForegroundColor Cyan
Set-Location "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
Set-Location ".."

# Wait for Vite to start
Write-Host "Waiting for Vite dev server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Start unified backend server
Write-Host "Starting Unified Backend Server..." -ForegroundColor Cyan
Set-Location "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$env:NODE_ENV='development'; npm run dev" -WindowStyle Normal
Set-Location ".."

# Wait for backend to start
Write-Host "Waiting for backend server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "MOHR HR V2 Development Environment Started (Unified Server)!" -ForegroundColor Green
Write-Host "🌐 Main Application: http://localhost:5000" -ForegroundColor Cyan
Write-Host "📊 API Health Check: http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host "🔧 Vite Dev Server: http://localhost:3001 (for HMR)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default Admin Credentials:" -ForegroundColor Yellow
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Architecture:" -ForegroundColor Yellow
Write-Host "   ✅ Single server on port 5000" -ForegroundColor Green
Write-Host "   ✅ Frontend proxied through backend" -ForegroundColor Green
Write-Host "   ✅ Hot Module Replacement via Vite" -ForegroundColor Green
Write-Host ""
Write-Host "To stop all servers, run: npm run stop" -ForegroundColor Yellow 