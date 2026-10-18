-- Add volume column to products table
-- This script can be run directly on Railway to fix the missing column error

DO $$ 
BEGIN
    -- Check if the volume column already exists before adding it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'volume'
    ) THEN
        ALTER TABLE "products" ADD COLUMN "volume" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
        
        -- Add a comment to document the column
        COMMENT ON COLUMN "products"."volume" IS 'Product volume/quantity multiplier (default: 1.0)';
        
        RAISE NOTICE '✅ Volume column added successfully to products table';
    ELSE
        RAISE NOTICE 'ℹ️ Volume column already exists in products table';
    END IF;
END $$;

