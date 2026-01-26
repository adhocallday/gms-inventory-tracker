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
    const migrationFile = process.argv[2] || '007_show_projections_enhancement.sql';
    const migrationPath = path.join(__dirname, '../supabase/migrations/', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`APPLYING MIGRATION: ${migrationFile}`);
    console.log('='.repeat(60));

    // Execute the entire SQL file
    console.log('Executing SQL...');
    await client.query(sql);

    console.log('✅ Migration applied successfully!\n');

    // Verify tables were created
    console.log('Verifying tables...');
    const tables = [
      'show_comps',
      'show_deliveries',
      'initial_inventory',
      'reorder_thresholds'
    ];

    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        ) as exists
      `, [table]);

      if (result.rows[0].exists) {
        console.log(`  ✅ ${table} created`);
      } else {
        console.log(`  ❌ ${table} not found`);
      }
    }

    // Verify views were created
    console.log('\nVerifying views...');
    const views = [
      'show_running_balances',
      'reorder_alerts'
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
