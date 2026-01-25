#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyViews() {
  console.log('APPLYING DATABASE VIEWS VIA SUPABASE CLIENT');
  console.log('='.repeat(60));

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/002_tracker_views.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    console.log('\nAttempting to execute via Supabase REST API...\n');

    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip pure comments
      if (statement.replace(/;/g, '').trim().startsWith('--')) continue;

      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);

      try {
        // Try using rpc if available
        const { error } = await supabase.rpc('exec_sql', { query: statement });

        if (error) {
          console.log(`  ⚠️  RPC not available: ${error.message}`);
          failCount++;
        } else {
          console.log(`  ✅ Executed`);
          successCount++;
        }
      } catch (e) {
        console.log(`  ❌ Failed: ${e.message}`);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Results: ${successCount} succeeded, ${failCount} failed`);

    if (failCount > 0) {
      console.log('\n⚠️  MANUAL MIGRATION REQUIRED');
      console.log('The Supabase client cannot execute DDL statements directly.');
      console.log('\nPlease apply the migration manually:');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the SQL from APPLY_MIGRATION.md');
      console.log('4. Click Run\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

applyViews();
