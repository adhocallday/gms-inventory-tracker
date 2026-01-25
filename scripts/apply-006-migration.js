#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = 'postgresql://postgres.mtfmckqbpykxblgpgnpo:gms_tour_2026@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

async function applyMigration() {
  const client = new Client({ connectionString: DB_URL });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected\n');

    // Check if tables already exist
    console.log('Checking existing tables...');
    const checkResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('product_images', 'tour_reports', 'report_sections', 'product_categories')
      ORDER BY tablename;
    `);

    if (checkResult.rows.length > 0) {
      console.log('⚠️  Tables already exist:');
      checkResult.rows.forEach(row => console.log(`   - ${row.tablename}`));
      console.log('\nSkipping migration (already applied)');
      return;
    }

    console.log('✓ No conflicts found\n');

    // Read and apply migration
    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '006_product_images_and_reports.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...\n');
    await client.query(sql);

    console.log('✅ Migration 006 applied successfully!\n');

    // Verify tables were created
    const verifyResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('product_images', 'tour_reports', 'report_sections', 'product_categories')
      ORDER BY tablename;
    `);

    console.log('Created tables:');
    verifyResult.rows.forEach(row => console.log(`   ✓ ${row.tablename}`));

    // Check if categories were seeded
    const categoryCount = await client.query('SELECT COUNT(*) as count FROM product_categories');
    console.log(`\n✓ Seeded ${categoryCount.rows[0].count} product categories`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
