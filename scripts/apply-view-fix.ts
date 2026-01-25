#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyViewFix() {
  console.log('🔄 Applying tour_reports_summary view fix...\n');

  const sqlFile = path.join(__dirname, 'fix-reports-view.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  console.log('Running SQL:\n');
  console.log(sql);
  console.log('\n');

  // Execute the SQL using Supabase's raw query API
  // Note: This requires database access via a SQL client
  // Since Supabase JS client doesn't support raw DDL directly,
  // we'll need to use the Supabase dashboard SQL editor or a direct connection

  console.log('⚠️  This script requires manual execution.\n');
  console.log('Please run the SQL above in your Supabase dashboard:\n');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor');
  console.log('4. Paste the SQL from above');
  console.log('5. Click "Run"\n');

  console.log('Or run it directly using psql:');
  console.log(`psql ${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'postgresql://')} < scripts/fix-reports-view.sql\n`);

  // Test if we can read from the view (this will fail if section_count doesn't exist yet)
  console.log('Testing current view structure...\n');
  const { data, error } = await supabase
    .from('tour_reports_summary')
    .select('id, title, section_count')
    .limit(1);

  if (error) {
    console.log('❌ View needs update (section_count field missing)');
    console.log('Error:', error.message);
  } else {
    console.log('✅ View structure looks correct!');
    if (data && data.length > 0) {
      console.log(`Sample: ${data[0].title} has ${data[0].section_count} sections`);
    }
  }
}

applyViewFix().catch(console.error);
