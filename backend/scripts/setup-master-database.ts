/**
 * Setup Master Database Script
 * 
 * This script helps you set up the master database for multi-tenant management.
 * 
 * Usage: ts-node scripts/setup-master-database.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

const execAsync = promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('🚀 Master Database Setup Script');
  console.log('================================\n');

  try {
    // Get database connection details
    const dbHost = await question('Database Host (default: localhost): ') || 'localhost';
    const dbPort = await question('Database Port (default: 5432): ') || '5432';
    const dbUser = await question('Database User (default: postgres): ') || 'postgres';
    const dbPassword = await question('Database Password: ');

    if (!dbPassword) {
      console.error('❌ Database password is required!');
      process.exit(1);
    }

    const dbName = 'inventory_master';

    console.log('\n📝 Configuration:');
    console.log(`   Host: ${dbHost}`);
    console.log(`   Port: ${dbPort}`);
    console.log(`   User: ${dbUser}`);
    console.log(`   Database: ${dbName}\n`);

    // Step 1: Check if database exists
    console.log('🔍 Checking if database exists...');
    try {
      const checkDb = `PGPASSWORD=${dbPassword} psql -h ${dbHost} -U ${dbUser} -p ${dbPort} -lqt | cut -d \\| -f 1 | grep -qw ${dbName}`;
      await execAsync(checkDb);
      console.log('✅ Database already exists.');
      
      const overwrite = await question('\n⚠️  Database exists. Do you want to recreate it? (yes/no): ');
      if (overwrite.toLowerCase() === 'yes') {
        console.log('🗑️  Dropping existing database...');
        await execAsync(`PGPASSWORD=${dbPassword} psql -h ${dbHost} -U ${dbUser} -p ${dbPort} -c "DROP DATABASE IF EXISTS ${dbName};"`);
        console.log('✅ Database dropped.');
      } else {
        console.log('ℹ️  Using existing database.');
      }
    } catch (error) {
      console.log('ℹ️  Database does not exist. Creating...');
    }

    // Step 2: Create database
    console.log('\n📦 Creating database...');
    try {
      await execAsync(`PGPASSWORD=${dbPassword} psql -h ${dbHost} -U ${dbUser} -p ${dbPort} -c "CREATE DATABASE ${dbName};"`);
      console.log('✅ Database created successfully!');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Database already exists, skipping creation.');
      } else {
        throw error;
      }
    }

    // Step 3: Generate Prisma Client
    console.log('\n🔧 Generating Prisma Client...');
    await execAsync('npm run master:generate');
    console.log('✅ Prisma Client generated!');

    // Step 4: Run migrations
    console.log('\n📊 Running migrations...');
    await execAsync('npm run master:migrate');
    console.log('✅ Migrations completed!');

    // Step 5: Seed database
    console.log('\n🌱 Seeding database...');
    await execAsync('npm run master:seed');
    console.log('✅ Database seeded!');

    console.log('\n🎉 Master database setup completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update your .env file with:');
    console.log(`   MASTER_DATABASE_URL="postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public"`);
    console.log('\n2. Default Super Admin Credentials:');
    console.log('   Email: superadmin@malindtech.com');
    console.log('   Password: superadmin123');
    console.log('\n3. Open Prisma Studio to verify:');
    console.log('   npm run master:studio');

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Make sure PostgreSQL is running');
    console.error('   - Check database credentials');
    console.error('   - Ensure psql is in your PATH');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();

