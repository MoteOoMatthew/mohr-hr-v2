# MOHR HR V2 - Simplified Development Startup
Write-Host "Starting MOHR HR V2 Development Environment..." -ForegroundColor Green

# Kill existing Node.js processes
Write-Host "Stopping existing Node.js processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe | Out-Null
Start-Sleep -Seconds 2

# Check if frontend is built
Write-Host "Checking frontend build..." -ForegroundColor Yellow
if (-not (Test-Path "backend/public/index.html")) {
    Write-Host "Frontend not built. Building now..." -ForegroundColor Cyan
    Set-Location "frontend"
    npm install
    npm run build
    Set-Location ".."
    
    # Copy built files to backend/public
    Write-Host "Copying built files to backend/public..." -ForegroundColor Cyan
    if (Test-Path "frontend/dist") {
        Copy-Item -Path "frontend/dist/*" -Destination "backend/public/" -Recurse -Force
        Write-Host "✅ Frontend files copied successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend build failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Frontend already built" -ForegroundColor Green
}

# Install backend dependencies if needed
Write-Host "Checking backend dependencies..." -ForegroundColor Yellow
Set-Location "backend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    npm install
}
Set-Location ".."

# Start the server
Write-Host "Starting development server..." -ForegroundColor Cyan
Set-Location "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -WindowStyle Normal
Set-Location ".."

Write-Host ""
Write-Host "🎉 MOHR HR V2 Development Environment Started!" -ForegroundColor Green
Write-Host "🌐 Application: http://localhost:5000" -ForegroundColor Cyan
Write-Host "📊 API Health: http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default Admin Credentials:" -ForegroundColor Yellow
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "To rebuild frontend after changes:" -ForegroundColor Yellow
Write-Host "   cd frontend && npm run build && cd .. && copy frontend\dist\* backend\public\" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop server: Ctrl+C in the server window" -ForegroundColor Yellow 