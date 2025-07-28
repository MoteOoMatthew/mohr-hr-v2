# Age to Date of Birth Migration Script
# This script migrates the employees table from age field to date_of_birth field

Write-Host "🔄 Starting Age to Date of Birth Migration..." -ForegroundColor Yellow

# Stop any running Node.js processes
Write-Host "🛑 Stopping any running Node.js processes..." -ForegroundColor Yellow
taskkill /f /im node.exe 2>$null

# Navigate to backend directory
Set-Location backend

# Run the migration
Write-Host "📊 Running database migration..." -ForegroundColor Yellow
node migrations/migrate_age_to_dob.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}

# Navigate back to root
Set-Location ..

Write-Host "🎉 Age to Date of Birth migration completed!" -ForegroundColor Green
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test the application to ensure everything works correctly" -ForegroundColor White
Write-Host "   2. Create a backup of the updated database" -ForegroundColor White
Write-Host "   3. Deploy the changes if testing is successful" -ForegroundColor White 