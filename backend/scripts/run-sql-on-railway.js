#!/usr/bin/env node
/**
 * Script to run SQL on Railway Postgres database
 * Usage: node scripts/run-sql-on-railway.js
 * 
 * This script reads the SQL from create-tenants-table.sql and executes it
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
    const sqlFile = path.join(__dirname, '../prisma/master/create-tenants-table.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ Error: SQL file not found at ${sqlFile}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📝 Reading SQL file...');
    console.log('🔌 Connecting to Railway Postgres database...');
    console.log('🚀 Executing SQL...\n');

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
    
    // Split SQL intelligently - handle DO blocks and multi-line statements
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    let dollarQuote = '';
    
    const lines = sql.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('--')) {
        continue;
      }
      
      // Check for DO $$ blocks
      if (line.match(/^DO\s+\$\$/)) {
        inDoBlock = true;
        dollarQuote = '$$';
        currentStatement = line + '\n';
        continue;
      }
      
      // Check for other dollar-quoted strings
      if (line.includes('$$')) {
        if (!inDoBlock) {
          const match = line.match(/\$([^$]*)\$/);
          if (match) {
            dollarQuote = '$' + match[1] + '$';
            inDoBlock = true;
          }
        } else if (line.includes(dollarQuote)) {
          inDoBlock = false;
          dollarQuote = '';
        }
        currentStatement += line + '\n';
        continue;
      }
      
      // If in DO block, keep adding lines
      if (inDoBlock) {
        currentStatement += line + '\n';
        continue;
      }
      
      // Regular statement
      currentStatement += line + ' ';
      
      // If line ends with semicolon and not in DO block, it's a complete statement
      if (line.endsWith(';') && !inDoBlock) {
        const stmt = currentStatement.trim();
        if (stmt && stmt !== ';') {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    // Execute statements one by one
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (!statement || statement === ';') continue;
      
      try {
        await client.query(statement);
        successCount++;
        // Show progress for important statements
        if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX')) {
          const tableMatch = statement.match(/"(.*?)"/);
          if (tableMatch) {
            console.log(`✅ Created: ${tableMatch[1]}`);
          }
        }
      } catch (err) {
        // Ignore "already exists" errors
        if (err.message.includes('already exists') || 
            err.message.includes('duplicate') ||
            err.message.includes('does not exist') && statement.includes('IF NOT EXISTS')) {
          // This is expected for IF NOT EXISTS statements
          continue;
        } else {
          errorCount++;
          console.error(`❌ Error: ${err.message.substring(0, 100)}`);
          // Don't stop on errors, continue with other statements
        }
      }
    }
    
    await client.end();
    
    console.log(`\n✅ Completed! ${successCount} statements executed successfully`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} statements had errors (may be expected)`);
    }
    console.log('\n🎉 Done! The tenants table should now exist.');
    console.log('💡 Try logging in to your app - it should work now!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runSQL();
