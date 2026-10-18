#!/usr/bin/env node
/**
 * Simple script to create tenant and user using SQL
 * Usage: node scripts/create-tenant-and-user-simple.js
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const dbUrl = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ Error: MASTER_DATABASE_URL or DATABASE_URL must be set');
    console.log('\n💡 Set it with:');
    console.log('   $env:MASTER_DATABASE_URL="your-connection-string"');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });

  // Tenant details
  const tenantShortId = '8549';
  const tenantName = 'Main Tenant';
  const tenantEmail = 'admin@tenant.com';
  const databaseName = 'tenant_8549';

  // User details
  const userEmail = 'mubeenwaris2003@gmail.com';
  const userPassword = 'Mubeen@123';
  const userName = 'Mubeen Waris';

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Check if tenant exists
    console.log(`🔍 Checking for tenant with short_tenant_id: ${tenantShortId}...`);
    const tenantCheck = await client.query(
      'SELECT id, name, "short_tenant_id", "is_active" FROM tenants WHERE "short_tenant_id" = $1 OR id = $1',
      [tenantShortId]
    );

    let tenantId;
    if (tenantCheck.rows.length > 0) {
      console.log('✅ Tenant already exists!');
      tenantId = tenantCheck.rows[0].id;
      console.log(`   ID: ${tenantId}`);
      console.log(`   Name: ${tenantCheck.rows[0].name}`);
      console.log(`   Short Tenant ID: ${tenantCheck.rows[0]["short_tenant_id"]}\n`);
    } else {
      console.log('📝 Creating new tenant...');
      
      // Generate UUID for tenant
      const uuidResult = await client.query('SELECT gen_random_uuid()::text as id');
      tenantId = uuidResult.rows[0].id;

      // Create tenant
      await client.query(`
        INSERT INTO tenants (
          id, name, email, "short_tenant_id", "database_name", "database_url",
          "subscription_type", "subscription_start_date", "is_active", "is_suspended",
          "created_at", "updated_at"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW(), true, false, NOW(), NOW()
        )
      `, [
        tenantId,
        tenantName,
        tenantEmail,
        tenantShortId,
        databaseName,
        dbUrl, // Using same database URL for now
        'PERMANENT'
      ]);

      console.log('✅ Tenant created successfully!');
      console.log(`   ID: ${tenantId}`);
      console.log(`   Name: ${tenantName}`);
      console.log(`   Short Tenant ID: ${tenantShortId}\n`);
    }

    // Step 2: Check if user exists
    console.log(`🔍 Checking for user: ${userEmail}...`);
    const userCheck = await client.query(
      'SELECT id, name, email, role, status FROM users WHERE email = $1',
      [userEmail]
    );

    if (userCheck.rows.length > 0) {
      console.log('✅ User already exists!');
      const existingUser = userCheck.rows[0];
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Status: ${existingUser.status}\n`);
      
      // Update password to ensure it's correct
      console.log('🔄 Updating password...');
      const passwordHash = await bcrypt.hash(userPassword, 10);
      await client.query(
        'UPDATE users SET "password_hash" = $1, status = $2, "updated_at" = NOW() WHERE email = $3',
        [passwordHash, 'ACTIVE', userEmail]
      );
      console.log('✅ Password updated!\n');
    } else {
      console.log('📝 Creating new user...');
      
      // Hash password
      const passwordHash = await bcrypt.hash(userPassword, 10);
      
      // Generate UUID for user
      const uuidResult = await client.query('SELECT gen_random_uuid()::text as id');
      const userId = uuidResult.rows[0].id;

      // Create user
      await client.query(`
        INSERT INTO users (
          id, name, email, "password_hash", role, status, "email_verified",
          "created_at", "updated_at"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, true, NOW(), NOW()
        )
      `, [
        userId,
        userName,
        userEmail,
        passwordHash,
        'ADMIN',
        'ACTIVE'
      ]);

      console.log('✅ User created successfully!');
      console.log(`   ID: ${userId}`);
      console.log(`   Name: ${userName}`);
      console.log(`   Email: ${userEmail}`);
      console.log(`   Role: ADMIN`);
      console.log(`   Status: ACTIVE\n`);
    }

    console.log('🎉 Setup complete!');
    console.log('\n📋 Summary:');
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Tenant Short ID: ${tenantShortId}`);
    console.log(`   User Email: ${userEmail}`);
    console.log(`   User Password: ${userPassword}`);
    console.log('\n✅ You can now login with:');
    console.log(`   Email: ${userEmail}`);
    console.log(`   Password: ${userPassword}`);
    console.log(`   Tenant ID: ${tenantShortId}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === '23505') {
      console.error('   Duplicate entry - tenant or user already exists');
    } else if (error.code === '42P01') {
      console.error('   Table does not exist - make sure tenants and users tables are created');
    }
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

