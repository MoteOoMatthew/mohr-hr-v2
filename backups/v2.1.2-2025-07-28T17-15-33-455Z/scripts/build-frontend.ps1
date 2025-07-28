# MOHR HR V2 - Frontend Build Script
Write-Host "Building frontend..." -ForegroundColor Green

# Build frontend
Set-Location "frontend"
Write-Host "Running npm run build..." -ForegroundColor Yellow
npm run build
Set-Location ".."

# Copy built files
Write-Host "Copying built files to backend/public..." -ForegroundColor Yellow
if (Test-Path "frontend/dist") {
    Copy-Item -Path "frontend/dist/*" -Destination "backend/public/" -Recurse -Force
    Write-Host "✅ Frontend rebuilt and copied successfully!" -ForegroundColor Green
    Write-Host "🌐 Refresh your browser at http://localhost:5000" -ForegroundColor Cyan
} else {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    exit 1
} 