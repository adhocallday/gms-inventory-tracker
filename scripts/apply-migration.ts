#!/usr/bin/env ts-node
/**
 * Script to apply database migration 005_product_centric_schema.sql
 *
 * Usage: npx ts-node scripts/apply-migration.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: Missing DATABASE_URL in .env.local');
  process.exit(1);
}

async function applyMigration() {
  let client;

  try {
    // Dynamic import of pg to avoid issues if not installed
    const { Client } = await import('pg');

    console.log('Connecting to database...');
    client = new Client({ connectionString: databaseUrl });
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

    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);

    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('pg')) {
      console.error('\nThe "pg" package is not installed.');
      console.error('Please install it with: npm install pg');
      console.error('\nOr apply the migration manually via Supabase Dashboard:');
      console.error('1. Go to https://supabase.com/dashboard');
      console.error('2. Navigate to SQL Editor');
      console.error('3. Copy and execute: supabase/migrations/005_product_centric_schema.sql');
    }

    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

applyMigration();
