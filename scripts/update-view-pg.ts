#!/usr/bin/env tsx
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function updateView() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const sql = fs.readFileSync(path.join(__dirname, 'fix-reports-view.sql'), 'utf-8');

    console.log('🔄 Executing SQL...\n');
    await client.query(sql);

    console.log('✅ View updated successfully!\n');

    // Test the updated view
    const result = await client.query(`
      SELECT id, title, section_count
      FROM tour_reports_summary
      LIMIT 3
    `);

    console.log('📊 Testing updated view:\n');
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.title}`);
      console.log(`   Sections: ${row.section_count}\n`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

updateView().catch(console.error);
