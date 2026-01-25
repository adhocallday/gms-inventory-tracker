#!/usr/bin/env node
/**
 * Script to apply database migration 005_product_centric_schema.sql
 *
 * Usage: node scripts/apply-migration.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.+)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const databaseUrl = envVars.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: Missing DATABASE_URL in .env.local');
  process.exit(1);
}

async function applyMigration() {
  const client = new Client({ connectionString: databaseUrl });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected\n');

    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '005_product_centric_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Applying migration to Supabase...');
    console.log('Migration contains:');
    console.log('- warehouse_locations table');
    console.log('- product_warehouse_allocations table');
    console.log('- product_show_projections table');
    console.log('- product_stock_movements table');
    console.log('- 2 utility views');
    console.log('- Seeding template locations (Road, Warehouse, Web)\n');

    console.log('Executing SQL...\n');

    // Execute the entire migration as a single transaction
    await client.query('BEGIN');

    try {
      await client.query(sql);
      await client.query('COMMIT');

      console.log('✓ warehouse_locations table created');
      console.log('✓ product_warehouse_allocations table created');
      console.log('✓ product_show_projections table created');
      console.log('✓ product_stock_movements table created');
      console.log('✓ Indexes and RLS policies created');
      console.log('✓ Utility views created');
      console.log('✓ Template locations seeded');

      console.log('\n✅ Migration applied successfully!');
      console.log('\nNext steps:');
      console.log('1. Test warehouse location manager at: /tours/[id]/settings/warehouses');
      console.log('2. Verify template locations (Road, Warehouse, Web) are seeded');
      console.log('3. Build product-centric projection sheet');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
