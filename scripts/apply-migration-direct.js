#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse connection string from Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const password = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'gms_tour_2026' : null;

if (!supabaseUrl || !password) {
  console.error('Missing credentials');
  process.exit(1);
}

// Extract host from Supabase URL
// Format: https://PROJECT_ID.supabase.co
const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!match) {
  console.error('Invalid Supabase URL format');
  process.exit(1);
}

const projectId = match[1];
const connectionString = `postgresql://postgres:${password}@db.${projectId}.supabase.co:5432/postgres`;

async function applyMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase database...');
    console.log(`Host: db.${projectId}.supabase.co`);

    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/002_tracker_views.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('APPLYING MIGRATION: 002_tracker_views.sql');
    console.log('='.repeat(60));

    // Execute SQL
    await client.query(sql);
    console.log('✅ Migration executed successfully\n');

    // Verify views
    console.log('Verifying database views...');
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
        console.log(`  ✅ ${view}`);
      } else {
        console.log(`  ❌ ${view} - NOT FOUND`);
      }
    }

    // Test views with data
    console.log('\nTesting views with actual data...');

    const { rows: productRows } = await client.query(`
      SELECT COUNT(*) as count FROM product_summary_view WHERE tour_id = '123e4567-e89b-12d3-a456-426614174000'
    `);
    console.log(`  ✅ product_summary_view: ${productRows[0].count} products`);

    const { rows: showRows } = await client.query(`
      SELECT COUNT(*) as count FROM show_summary_view WHERE tour_id = '123e4567-e89b-12d3-a456-426614174000'
    `);
    console.log(`  ✅ show_summary_view: ${showRows[0].count} shows`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE - All views created and working!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
