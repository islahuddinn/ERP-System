# Seed Phase-1 data using SQL directly

$ErrorActionPreference = "Continue"

$dbHost = "localhost"
$dbPort = "5434"
$dbUser = "postgres"
$dbPassword = "password"

# Find psql
$psqlPath = "C:\Program Files\PostgreSQL\13\bin\psql.exe"
if (-not (Test-Path $psqlPath)) {
    $pgDirs = Get-ChildItem "$env:ProgramFiles\PostgreSQL" -Directory -ErrorAction SilentlyContinue
    foreach ($dir in $pgDirs) {
        $testPath = Join-Path $dir.FullName "bin\psql.exe"
        if (Test-Path $testPath) {
            $psqlPath = $testPath
            break
        }
    }
}

$env:PGPASSWORD = $dbPassword

Write-Host "Seeding Phase-1 test data..." -ForegroundColor Cyan
Write-Host ""

# Encryption key (must match ENCRYPTION_KEY in .env)
$encryptionKey = "01234567890123456789012345678901"
$tenantDbUrl = "postgresql://postgres:password@localhost:5434/inventory?schema=public"

# For now, we'll store the URL as plaintext (in production it should be encrypted)
# The encryption service will handle decryption
$encryptedUrl = $tenantDbUrl  # Simplified for localhost setup

# Seed master database - test tenant
Write-Host "Creating test tenant in master database..." -ForegroundColor Yellow
$masterSql = @"
INSERT INTO tenants (id, name, email, database_name, database_url, subscription_type, subscription_start_date, is_active, is_suspended, created_at, updated_at)
VALUES ('8549', 'Test Tenant', 'test@example.com', 'inventory', '$encryptedUrl', 'PERMANENT', NOW(), true, false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  database_url = EXCLUDED.database_url,
  is_active = EXCLUDED.is_active,
  is_suspended = EXCLUDED.is_suspended,
  updated_at = NOW();
"@

$result = & $psqlPath -U $dbUser -h $dbHost -p $dbPort -d inventory_master -c $masterSql 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Test tenant created/updated in master database" -ForegroundColor Green
} else {
    Write-Host "Warning: $result" -ForegroundColor Yellow
}

# Seed tenant database - test user (password: password123)
Write-Host ""
Write-Host "Creating test admin user in tenant database..." -ForegroundColor Yellow

# Generate bcrypt hash for password123
# Using Node.js to generate the hash
$hashScript = @"
const bcrypt = require('bcrypt');
bcrypt.hash('password123', 10).then(hash => {
  console.log(hash);
});
"@

$hashedPassword = node -e $hashScript

$tenantSql = @"
INSERT INTO users (id, email, name, password_hash, role, status, email_verified, created_at, updated_at)
VALUES (gen_random_uuid(), 'john@example.com', 'John Doe', '$hashedPassword', 'ADMIN', 'ACTIVE', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  status = EXCLUDED.status,
  updated_at = NOW();
"@

$result = & $psqlPath -U $dbUser -h $dbHost -p $dbPort -d inventory -c $tenantSql 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Test admin user created/updated in tenant database" -ForegroundColor Green
} else {
    Write-Host "Warning: $result" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Seeding completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Cyan
Write-Host "  Email: john@example.com" -ForegroundColor White
Write-Host "  Password: password123" -ForegroundColor White
Write-Host "  Tenant ID: 8549" -ForegroundColor White

