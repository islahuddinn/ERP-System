# PowerShell Script for Master Database Setup (Windows)
# Simple version - uses environment variables or defaults

Write-Host "🚀 Master Database Setup Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Get database details (with defaults)
$dbHost = $env:DB_HOST ?? "localhost"
$dbPort = $env:DB_PORT ?? "5432"
$dbUser = $env:DB_USER ?? "postgres"
$dbPassword = $env:DB_PASSWORD ?? Read-Host "Database Password" -AsSecureString
$dbName = "inventory_master"

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
$dbPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host "`n📝 Configuration:" -ForegroundColor Yellow
Write-Host "   Host: $dbHost"
Write-Host "   Port: $dbPort"
Write-Host "   User: $dbUser"
Write-Host "   Database: $dbName`n"

# PostgreSQL path
$psqlPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

if (-not (Test-Path $psqlPath)) {
    Write-Host "❌ PostgreSQL not found at: $psqlPath" -ForegroundColor Red
    Write-Host "💡 Please update the path in this script or add PostgreSQL to PATH" -ForegroundColor Yellow
    exit 1
}

# Step 1: Check if database exists
Write-Host "🔍 Checking if database exists..." -ForegroundColor Cyan
$dbExists = & $psqlPath -U $dbUser -h $dbHost -p $dbPort -lqt 2>&1 | Select-String $dbName

if ($dbExists) {
    Write-Host "✅ Database already exists." -ForegroundColor Green
    $overwrite = Read-Host "`n⚠️  Database exists. Do you want to recreate it? (yes/no)"
    if ($overwrite -eq "yes") {
        Write-Host "🗑️  Dropping existing database..." -ForegroundColor Yellow
        $env:PGPASSWORD = $dbPasswordPlain
        & $psqlPath -U $dbUser -h $dbHost -p $dbPort -c "DROP DATABASE IF EXISTS $dbName;"
        Write-Host "✅ Database dropped." -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Using existing database." -ForegroundColor Blue
    }
} else {
    Write-Host "ℹ️  Database does not exist. Creating..." -ForegroundColor Blue
}

# Step 2: Create database
Write-Host "`n📦 Creating database..." -ForegroundColor Cyan
$env:PGPASSWORD = $dbPasswordPlain
try {
    & $psqlPath -U $dbUser -h $dbHost -p $dbPort -c "CREATE DATABASE $dbName;" 2>&1 | Out-Null
    Write-Host "✅ Database created successfully!" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  Database may already exist, continuing..." -ForegroundColor Blue
}

# Step 3: Generate Prisma Client
Write-Host "`n🔧 Generating Prisma Client..." -ForegroundColor Cyan
npm run master:generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client generated!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}

# Step 4: Run migrations
Write-Host "`n📊 Running migrations..." -ForegroundColor Cyan
npm run master:migrate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migrations completed!" -ForegroundColor Green
} else {
    Write-Host "❌ Migrations failed" -ForegroundColor Red
    exit 1
}

# Step 5: Seed database
Write-Host "`n🌱 Seeding database..." -ForegroundColor Cyan
npm run master:seed
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database seeded!" -ForegroundColor Green
} else {
    Write-Host "❌ Seeding failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Master database setup completed successfully!" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update your .env file with:"
Write-Host "   MASTER_DATABASE_URL=`"postgresql://$dbUser`:$dbPasswordPlain@$dbHost`:$dbPort/$dbName?schema=public`""
Write-Host "`n2. Default Super Admin Credentials:"
Write-Host "   Email: superadmin@malindtech.com"
Write-Host "   Password: superadmin123"
Write-Host "`n3. Open Prisma Studio to verify:"
Write-Host "   npm run master:studio"

# Clean up
Remove-Item Env:\PGPASSWORD

