#!/usr/bin/env ts-node
/**
 * Script to run master database migrations using db push
 * Prisma v7 doesn't support url in schema, so we use db push as a workaround
 */

const { execSync } = require('child_process');

try {
  console.log('Running master database migrations (using db push)...');
  console.log('Note: For production, consider using proper migrations once Prisma v7 migration support is stable');
  
  // Use db push as workaround for Prisma v7
  // Get the database URL from MASTER_DATABASE_URL
  const dbUrl = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ Error: MASTER_DATABASE_URL or DATABASE_URL must be set');
    process.exit(1);
  }
  
  // Use --url flag to pass the database URL directly
  execSync(
    `npx prisma db push --schema=prisma/master/schema.prisma --accept-data-loss --url="${dbUrl}"`,
    {
      stdio: 'inherit',
      shell: true,
    }
  );
  console.log('✅ Master database schema pushed successfully');
} catch (error) {
  console.error('❌ Schema push failed:', error.message);
  process.exit(1);
}

