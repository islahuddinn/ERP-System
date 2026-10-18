#!/usr/bin/env node
/**
 * Script to add volume column to products table on Railway
 * Usage: node scripts/add-volume-to-products.js
 * 
 * This script adds the volume column to the products table in the tenant database
 * Set DATABASE_URL to your tenant database connection string
 */

const fs = require('fs');
const path = require('path');

async function addVolumeColumn() {
  try {
    // Get database URL from environment
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      console.error('❌ Error: DATABASE_URL must be set');
      console.log('\n💡 To get the database URL:');
      console.log('   railway variables --service Postgres');
      console.log('   Then set: $env:DATABASE_URL="your-connection-string"');
      console.log('\n⚠️  Note: This should be the TENANT database URL, not the master database');
      process.exit(1);
    }

    console.log('🔌 Connecting to Railway Postgres database...');

    // Install pg if not available
    let pg;
    try {
      pg = require('pg');
    } catch (e) {
      console.log('📦 Installing pg package...');
      const { execSync } = require('child_process');
      execSync('npm install pg', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      pg = require('pg');
    }

    const client = new pg.Client({ connectionString: dbUrl });
    
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name = 'volume';
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('ℹ️  Volume column already exists in products table');
      await client.end();
      return;
    }

    console.log('📝 Adding volume column to products table...');

    // Add the volume column
    const addColumnQuery = `
      ALTER TABLE "products" 
      ADD COLUMN "volume" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
    `;

    await client.query(addColumnQuery);
    
    // Add comment
    const commentQuery = `
      COMMENT ON COLUMN "products"."volume" IS 'Product volume/quantity multiplier (default: 1.0)';
    `;
    
    await client.query(commentQuery);
    
    await client.end();
    
    console.log('✅ Volume column added successfully!');
    console.log('🎉 The products table now has the volume column.');
    console.log('💡 Try creating a product again - it should work now!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Column already exists - this is fine!');
    } else {
      console.error('Full error:', error);
      process.exit(1);
    }
  }
}

addVolumeColumn();

