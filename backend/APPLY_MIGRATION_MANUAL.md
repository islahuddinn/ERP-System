# Manual Migration Guide: Add warehouseId to ProductionOrder

## Step 1: Apply the SQL Migration

You need to run the SQL migration manually on your database. Choose one method below:

### Method A: Using psql (Command Line)

```powershell
cd backend
# Get your DATABASE_URL from .env
$dbUrl = (Get-Content .env | Select-String '^DATABASE_URL=').ToString() -replace '^DATABASE_URL=', '' -replace '^"', '' -replace '"$', ''

# Run the migration SQL
Get-Content "prisma\migrations\20250224000000_add_production_order_warehouse\migration.sql" | psql $dbUrl
```

### Method B: Using Railway CLI (if deployed on Railway)

```powershell
cd backend
railway connect
railway run psql < prisma\migrations\20250224000000_add_production_order_warehouse\migration.sql
```

### Method C: Using pgAdmin or any PostgreSQL GUI

1. Open your database client (pgAdmin, DBeaver, etc.)
2. Connect to your database using the `DATABASE_URL` from your `.env` file
3. Open a new SQL query window
4. Copy and paste the contents of:
   `backend/prisma/migrations/20250224000000_add_production_order_warehouse/migration.sql`
5. Execute the SQL

### Method D: Using Node.js script

```powershell
cd backend
node -e "
const { PrismaClient } = require('@prisma/tenant-client');
const fs = require('fs');
const prisma = new PrismaClient();
const sql = fs.readFileSync('prisma/migrations/20250224000000_add_production_order_warehouse/migration.sql', 'utf8');
prisma.\$executeRawUnsafe(sql).then(() => {
  console.log('Migration applied successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
"
```

## Step 2: Verify the Migration

After running the SQL, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'production_orders'
AND column_name = 'warehouse_id';

-- Should return:
-- column_name: warehouse_id
-- data_type: uuid
-- is_nullable: YES
```

## Step 3: Mark Migration as Applied

Once the SQL is successfully applied, mark it as applied in Prisma:

```powershell
cd backend

# Load environment variables
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
    $key = $matches[1].Trim()
    $value = $matches[2].Trim() -replace '^["'']|["'']$', ''
    [Environment]::SetEnvironmentVariable($key, $value, 'Process')
  }
}

# Mark migration as applied
npx prisma migrate resolve --applied 20250224000000_add_production_order_warehouse
```

## Step 4: Verify Everything Works

```powershell
# Generate Prisma Client with the new schema
npx prisma generate

# Verify the schema is in sync
npx prisma migrate status
```

## SQL Content (for reference)

The migration SQL adds:

- `warehouse_id` column (UUID, nullable) to `production_orders` table
- Foreign key constraint to `warehouses` table
- Index on `warehouse_id` for performance
- Column comment for documentation

The SQL is idempotent (safe to run multiple times) - it checks if the column exists before adding it.
