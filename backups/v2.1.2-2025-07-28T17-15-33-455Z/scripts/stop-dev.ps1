# MOHR HR V2 Development Stop Script
# This script stops all development servers and cleans up processes

Write-Host "🛑 Stopping MOHR HR V2 Development Environment..." -ForegroundColor Red

# Function to kill processes on specific ports
function Kill-PortProcess {
    param([int]$Port)
    
    Write-Host "🔍 Checking for processes on port $Port..." -ForegroundColor Yellow
    
    # Find processes using the port
    $processes = netstat -ano | findstr ":$Port " | findstr "LISTENING"
    
    if ($processes) {
        Write-Host "⚠️  Found processes using port $Port. Terminating..." -ForegroundColor Yellow
        
        foreach ($process in $processes) {
            $parts = $process -split '\s+'
            $pid = $parts[-1]
            
            if ($pid -and $pid -ne "0") {
                try {
                    taskkill /PID $pid /F | Out-Null
                    Write-Host "✅ Terminated process PID: $pid" -ForegroundColor Green
                }
                catch {
                    Write-Host "❌ Failed to terminate process PID: $pid" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "✅ No processes found on port $Port" -ForegroundColor Green
    }
}

# Kill all Node.js processes
Write-Host "🔍 Stopping all Node.js processes..." -ForegroundColor Yellow
try {
    taskkill /F /IM node.exe | Out-Null
    Write-Host "✅ All Node.js processes terminated" -ForegroundColor Green
}
catch {
    Write-Host "ℹ️  No Node.js processes found or already terminated" -ForegroundColor Cyan
}

# Kill processes on specific ports
Kill-PortProcess -Port 5000  # Backend
Kill-PortProcess -Port 3001  # Frontend

# Wait a moment for cleanup
Start-Sleep -Seconds 2

# Verify ports are free
Write-Host ""
Write-Host "🔍 Verifying ports are free..." -ForegroundColor Yellow

$backendFree = -not (netstat -ano | findstr ":5000 " | findstr "LISTENING")
$frontendFree = -not (netstat -ano | findstr ":3001 " | findstr "LISTENING")

if ($backendFree) {
    Write-Host "✅ Port 5000 (Backend) is free" -ForegroundColor Green
} else {
    Write-Host "⚠️  Port 5000 (Backend) may still be in use" -ForegroundColor Yellow
}

if ($frontendFree) {
    Write-Host "✅ Port 3001 (Frontend) is free" -ForegroundColor Green
} else {
    Write-Host "⚠️  Port 3001 (Frontend) may still be in use" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 MOHR HR V2 Development Environment Stopped!" -ForegroundColor Green
Write-Host "💡 To restart, run: .\scripts\start-dev.ps1" -ForegroundColor Cyan 