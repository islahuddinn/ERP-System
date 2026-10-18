# Step-by-Step: Run Migration SQL in pgAdmin 4

## Step 1: Connect to Your Database Server

1. In the **Object Explorer** (left pane), find your PostgreSQL server
   - Look for "PostgreSQL 13" or "PostgreSQL 18" (or your server name)
   - If you see a red 'X' icon, the server is disconnected

2. **Connect to the server:**
   - Right-click on your PostgreSQL server
   - Select **"Connect Server"** from the context menu
   - Enter your password if prompted
   - Wait for the connection to establish (the red 'X' should disappear)

## Step 2: Navigate to Your Database

1. Expand your server by clicking the arrow next to it
2. Expand **"Databases"**
3. Find and expand your database (likely named "inventory" or similar)
4. Expand **"Schemas"**
5. Expand **"public"** (or your schema name)

## Step 3: Open Query Tool

You have two options:

### Option A: Right-click method
1. Right-click on your **database name** (e.g., "inventory")
2. Select **"Query Tool"** from the context menu

### Option B: Toolbar method
1. Click on your **database name** to select it
2. Click the **"Query Tool"** icon in the toolbar (looks like a play button or SQL icon)

## Step 4: Copy the SQL Migration

The SQL migration is in this file:
```
backend\prisma\migrations\20250224000000_add_production_order_warehouse\migration.sql
```

**Copy the entire contents** of the file (you can open it in any text editor).

## Step 5: Paste and Execute SQL

1. In the **Query Tool** window that opened:
   - You'll see a large text area for SQL queries
   - **Paste** the SQL migration code you copied

2. **Review the SQL** to make sure it's all there:
   ```sql
   -- AlterTable: Add warehouseId column to production_orders table
   -- This migration adds the warehouseId column to ProductionOrder model
   
   DO $$ 
   BEGIN
       -- Check if the warehouse_id column already exists before adding it
       IF NOT EXISTS (
           SELECT 1 
           FROM information_schema.columns 
           WHERE table_name = 'production_orders' 
           AND column_name = 'warehouse_id'
       ) THEN
           -- Add the warehouse_id column as nullable UUID
           ALTER TABLE "production_orders" ADD COLUMN "warehouse_id" UUID;
           
           -- Add foreign key constraint to warehouses table
           ALTER TABLE "production_orders" 
           ADD CONSTRAINT "production_orders_warehouse_id_fkey" 
           FOREIGN KEY ("warehouse_id") 
           REFERENCES "warehouses"("id") 
           ON DELETE SET NULL 
           ON UPDATE CASCADE;
           
           -- Add index for better query performance
           CREATE INDEX IF NOT EXISTS "production_orders_warehouse_id_idx" 
           ON "production_orders"("warehouse_id");
           
           -- Add a comment to document the column
           COMMENT ON COLUMN "production_orders"."warehouse_id" IS 'Source warehouse for production order materials';
       END IF;
   END $$;
   ```

3. **Execute the SQL:**
   - Click the **"Execute"** button (green play button ▶️) in the toolbar
   - OR press **F5** on your keyboard
   - OR go to **Query → Execute** from the menu

## Step 6: Check the Results

1. Look at the **Messages** tab at the bottom of the Query Tool
2. You should see a success message like:
   ```
   Query returned successfully with no result in X ms.
   ```
   or
   ```
   DO
   Query returned successfully in X ms.
   ```

3. If you see an **error**, read the error message carefully and let me know what it says.

## Step 7: Verify the Migration (Optional)

To verify the column was added, run this query in the same Query Tool:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'production_orders' 
AND column_name = 'warehouse_id';
```

**Expected result:**
- `column_name`: warehouse_id
- `data_type`: uuid
- `is_nullable`: YES

## Troubleshooting

**If you get a connection error:**
- Make sure your PostgreSQL server is running
- Check your connection settings (host, port, username, password)
- Verify your database name is correct

**If you get a permission error:**
- Make sure your database user has ALTER TABLE permissions
- You may need to connect as a superuser or database owner

**If the column already exists:**
- That's okay! The SQL checks for this and won't create duplicates
- The migration is idempotent (safe to run multiple times)

## Visual Guide

```
pgAdmin 4 Layout:
┌─────────────────────────────────────────────────┐
│ File Edit View Tools Window Help                │
├──────────┬──────────────────────────────────────┤
│          │ [Dashboard] [SQL] [Statistics] ...  │
│ Object   ├──────────────────────────────────────┤
│ Explorer │                                      │
│          │  Query Tool Window:                  │
│ Servers  │  ┌──────────────────────────────┐   │
│  └─PostgreSQL│  │ Paste SQL here...        │   │
│    └─Databases│  │                          │   │
│      └─inventory│  │                          │   │
│        └─Schemas│  └──────────────────────────────┘   │
│          └─public│  [Execute ▶️] [Save] [Clear]      │
│                  │                                      │
│                  │  Messages:                          │
│                  │  Query returned successfully...     │
└──────────┴──────────────────────────────────────┘
```

## After Running the SQL

Once the SQL executes successfully:
1. ✅ The `warehouse_id` column is now in your database
2. ✅ The migration is already marked as applied in Prisma (we did that earlier)
3. ✅ Prisma Client is already generated (we did that earlier)

**You're all set!** The migration is complete. 🎉

