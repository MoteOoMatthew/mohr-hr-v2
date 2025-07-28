# MOHR HR V2 Production Build Script
Write-Host "Building MOHR HR V2 for Production..." -ForegroundColor Green

# Set production environment
$env:NODE_ENV = "production"

# Install dependencies if needed
Write-Host "Checking dependencies..." -ForegroundColor Yellow

# Backend dependencies
Set-Location "backend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    npm install
}
Set-Location ".."

# Frontend dependencies
Set-Location "frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    npm install
}

# Build frontend for production
Write-Host "Building frontend for production..." -ForegroundColor Cyan
npm run build

# Check if build was successful
if (-not (Test-Path "dist")) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend built successfully" -ForegroundColor Green
Set-Location ".."

# Copy frontend build to backend for unified serving
Write-Host "Preparing unified server..." -ForegroundColor Cyan
$frontendDistPath = "frontend/dist"
$backendPublicPath = "backend/public"

# Create public directory in backend if it doesn't exist
if (-not (Test-Path $backendPublicPath)) {
    New-Item -ItemType Directory -Path $backendPublicPath -Force | Out-Null
}

# Copy frontend build to backend public directory
Write-Host "Copying frontend build to backend..." -ForegroundColor Cyan
Copy-Item -Path "$frontendDistPath/*" -Destination $backendPublicPath -Recurse -Force

Write-Host ""
Write-Host "✅ Production build completed!" -ForegroundColor Green
Write-Host "📦 Frontend built and copied to backend/public" -ForegroundColor Cyan
Write-Host "🚀 Ready for production deployment" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start production server:" -ForegroundColor Yellow
Write-Host "   cd backend && npm start" -ForegroundColor White
Write-Host ""
Write-Host "Production server will serve both API and frontend from port 5000" -ForegroundColor Cyan 