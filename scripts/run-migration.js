#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/002_tracker_views.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('APPLYING MIGRATION: 002_tracker_views.sql');
    console.log('='.repeat(60));

    // Execute the entire SQL file
    console.log('Executing SQL...');
    await client.query(sql);

    console.log('✅ Migration applied successfully!\n');

    // Verify views were created
    console.log('Verifying views...');
    const views = [
      'show_summary_view',
      'product_summary_view',
      'po_open_qty_view',
      'stock_movement_view'
    ];

    for (const view of views) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views
          WHERE table_schema = 'public'
          AND table_name = $1
        ) as exists
      `, [view]);

      if (result.rows[0].exists) {
        console.log(`  ✅ ${view} created`);
      } else {
        console.log(`  ❌ ${view} not found`);
      }
    }

    // Check if bucket column was added
    const bucketResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'forecast_overrides'
        AND column_name = 'bucket'
      ) as exists
    `);

    if (bucketResult.rows[0].exists) {
      console.log(`  ✅ forecast_overrides.bucket column added`);
    } else {
      console.log(`  ℹ️  forecast_overrides.bucket column not added (may already exist)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration complete!');

  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
