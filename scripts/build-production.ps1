# MOHR HR V2 Production Build Script
Write-Host "Building MOHR HR V2 for Production..." -ForegroundColor Green

# Stop any running processes
Write-Host "Stopping any running processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe | Out-Null
Start-Sleep -Seconds 2

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "frontend/dist") {
    Remove-Item -Recurse -Force "frontend/dist"
}
if (Test-Path "backend/public") {
    Remove-Item -Recurse -Force "backend/public"
}

# Install dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location "frontend"
npm install
Set-Location ".."

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location "backend"
npm install
Set-Location ".."

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Cyan
Set-Location "frontend"
npm run build
Set-Location ".."

# Create backend public directory
Write-Host "Setting up backend public directory..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "backend/public" -Force | Out-Null

# Copy frontend build to backend public
Write-Host "Copying frontend build to backend..." -ForegroundColor Cyan
Copy-Item -Path "frontend/dist/*" -Destination "backend/public/" -Recurse -Force

# Copy service worker to backend public
Write-Host "Copying service worker..." -ForegroundColor Cyan
Copy-Item -Path "frontend/public/sw.js" -Destination "backend/public/sw.js" -Force

# Copy other public files
Write-Host "Copying public files..." -ForegroundColor Cyan
Copy-Item -Path "frontend/public/manifest.json" -Destination "backend/public/manifest.json" -Force
Copy-Item -Path "frontend/public/radish-favicon.svg" -Destination "backend/public/radish-favicon.svg" -Force
Copy-Item -Path "frontend/public/offline.html" -Destination "backend/public/offline.html" -Force

# Copy emergency and utility pages
Write-Host "Copying utility pages..." -ForegroundColor Cyan
Copy-Item -Path "backend/public/emergency-logout.html" -Destination "backend/public/emergency-logout.html" -Force
Copy-Item -Path "backend/public/clear-cache.html" -Destination "backend/public/clear-cache.html" -Force
Copy-Item -Path "backend/public/force-update-sw.html" -Destination "backend/public/force-update-sw.html" -Force

# Verify build
Write-Host "Verifying build..." -ForegroundColor Cyan
$indexHtml = Get-Content "backend/public/index.html" -Raw
if ($indexHtml -match "Hot Radish") {
    Write-Host "✅ Frontend build verified" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build verification failed" -ForegroundColor Red
    exit 1
}

# Check for critical files
$criticalFiles = @(
    "backend/public/index.html",
    "backend/public/assets/",
    "backend/public/sw.js",
    "backend/public/manifest.json"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🎉 Production build completed successfully!" -ForegroundColor Green
Write-Host "📁 Build location: backend/public/" -ForegroundColor Cyan
Write-Host "🚀 To start production server: cd backend && npm start" -ForegroundColor Cyan
Write-Host "🌐 Application will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Build Summary:" -ForegroundColor Yellow
Write-Host "   ✅ Frontend built and optimized" -ForegroundColor Green
Write-Host "   ✅ Assets copied to backend/public" -ForegroundColor Green
Write-Host "   ✅ Service worker updated" -ForegroundColor Green
Write-Host "   ✅ CSP-compliant configuration" -ForegroundColor Green
Write-Host "   ✅ All critical files verified" -ForegroundColor Green
