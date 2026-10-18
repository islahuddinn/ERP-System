# Phase 1 Quick Setup Script
# This script sets up Phase 1 test data

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   PHASE 1 QUICK SETUP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$psqlPath = "C:\Program Files\PostgreSQL\13\bin\psql.exe"
$pgPort = "5434"
$pgUser = "postgres"
$pgPassword = "password"

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $pgPassword

Write-Host "[1/6] Checking PostgreSQL connection..." -ForegroundColor Yellow
try {
    $version = & $psqlPath -U $pgUser -p $pgPort -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ PostgreSQL connected" -ForegroundColor Green
    } else {
        Write-Host "   ❌ PostgreSQL connection failed" -ForegroundColor Red
        Write-Host "   Error: $version" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ PostgreSQL connection failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/6] Creating master database if not exists..." -ForegroundColor Yellow
$createMasterDb = @"
CREATE DATABASE inventory_master;
"@
& $psqlPath -U $pgUser -p $pgPort -c $createMasterDb 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 1) {
    Write-Host "   ✅ Master database ready" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Master database may already exist" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/6] Creating tenant database if not exists..." -ForegroundColor Yellow
$createTenantDb = @"
CREATE DATABASE inventory;
"@
& $psqlPath -U $pgUser -p $pgPort -c $createTenantDb 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 1) {
    Write-Host "   ✅ Tenant database ready" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Tenant database may already exist" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4/6] Running master migrations..." -ForegroundColor Yellow
Set-Location $PSScriptRoot\..
npm run master:migrate 2>&1 | Select-Object -Last 10
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Master migrations completed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Migrations may have issues, but continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[5/6] Creating test tenant..." -ForegroundColor Yellow
$createTenant = @"
INSERT INTO tenants (
    id, name, email, short_tenant_id, database_name, database_url,
    subscription_type, subscription_start_date, is_active, is_suspended,
    created_at, updated_at
) VALUES (
    '8549',
    'Test Tenant',
    'test@example.com',
    '8549',
    'inventory',
    'cG9zdGdyZXNxbDovL3Bvc3RncmVzOnBhc3N3b3JkQGxvY2FsaG9zdDo1NDM0L2ludmVudG9yeT9zY2hlbWE9cHVibGlj',
    'PERMANENT',
    NOW(),
    true,
    false,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
"@
& $psqlPath -U $pgUser -p $pgPort -d inventory_master -c $createTenant 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Test tenant created/verified" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Tenant may already exist" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[6/6] Creating test user..." -ForegroundColor Yellow
Write-Host "   Note: User creation requires bcrypt hash. Run setup script:" -ForegroundColor Yellow
Write-Host "   ts-node scripts/setup-phase1-test-data.ts" -ForegroundColor Cyan

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   SETUP COMPLETE" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: ts-node scripts/setup-phase1-test-data.ts" -ForegroundColor White
Write-Host "2. Start backend: npm run start:dev" -ForegroundColor White
Write-Host "3. Test login at: http://localhost:5000/api/docs" -ForegroundColor White
Write-Host ""



