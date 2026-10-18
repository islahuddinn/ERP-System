#!/usr/bin/env node
/**
 * Script to create indexes on Railway Postgres database
 * Usage: node scripts/run-indexes-on-railway.js
 * 
 * This script reads the SQL from create-tenants-indexes.sql and executes it
 * using the MASTER_DATABASE_URL from environment variables
 */

const fs = require('fs');
const path = require('path');

async function runSQL() {
  try {
    // Get database URL from environment
    const dbUrl = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!dbUrl) {
      console.error('❌ Error: MASTER_DATABASE_URL or DATABASE_URL must be set');
      console.log('\n💡 To get the database URL:');
      console.log('   railway variables --service postgres');
      console.log('   Then set: $env:MASTER_DATABASE_URL="your-connection-string"');
      process.exit(1);
    }

    // Read SQL file
    const sqlFile = path.join(__dirname, '../prisma/master/create-tenants-indexes.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ Error: SQL file not found at ${sqlFile}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📝 Reading index SQL file...');
    console.log('🔌 Connecting to Railway Postgres database...');
    console.log('🚀 Creating indexes...\n');

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
    
    // Split SQL into statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 0);
    
    // Execute statements one by one
    let successCount = 0;
    let errorCount = 0;
    const createdIndexes = [];
    
    for (const statement of statements) {
      if (!statement || statement === ';') continue;
      
      try {
        const result = await client.query(statement + ';');
        
        // Extract index name from CREATE INDEX statements
        const indexMatch = statement.match(/CREATE\s+(?:UNIQUE\s+)?INDEX[^"]*"([^"]+)"/i);
        if (indexMatch) {
          createdIndexes.push(indexMatch[1]);
          console.log(`✅ Created index: ${indexMatch[1]}`);
        } else if (statement.trim().toUpperCase().startsWith('SELECT')) {
          // This is the verification query - show results
          if (result.rows && result.rows.length > 0) {
            console.log('\n📊 Indexes on tenants table:');
            result.rows.forEach(row => {
              console.log(`   - ${row.indexname}`);
            });
          }
        }
        successCount++;
      } catch (err) {
        // Ignore "already exists" errors (IF NOT EXISTS)
        if (err.message.includes('already exists') || 
            err.message.includes('duplicate key') ||
            err.message.includes('relation') && err.message.includes('already exists')) {
          const indexMatch = statement.match(/CREATE\s+(?:UNIQUE\s+)?INDEX[^"]*"([^"]+)"/i);
          if (indexMatch) {
            console.log(`ℹ️  Index already exists: ${indexMatch[1]}`);
          }
          continue;
        } else {
          errorCount++;
          console.error(`❌ Error: ${err.message.substring(0, 150)}`);
          console.error(`   Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }
    
    await client.end();
    
    console.log(`\n✅ Completed! ${successCount} statements executed successfully`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} statements had errors`);
    }
    console.log(`\n📊 Total indexes created/verified: ${createdIndexes.length}`);
    console.log('\n🎉 Done! All indexes are now created on the tenants table.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runSQL();

