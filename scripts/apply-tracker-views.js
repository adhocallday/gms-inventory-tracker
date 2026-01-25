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
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyTrackerViews() {
  console.log('APPLYING TRACKER VIEWS MIGRATION');
  console.log('='.repeat(60));

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/002_tracker_views.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('\nMigration file:', migrationPath);
  console.log('SQL length:', sql.length, 'characters\n');

  // Split by statement (very basic - splits on semicolon followed by newline)
  const statements = sql
    .split(';\n')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements\n`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    const preview = statement.substring(0, 100).replace(/\n/g, ' ');

    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

    if (error) {
      // Try direct query as fallback
      const { error: queryError } = await supabase.from('_dummy').select('*');

      // Since we can't execute arbitrary SQL via Supabase client, we'll use a different approach
      console.log('  ⚠️  Cannot execute SQL directly via Supabase JS client');
      console.log('  ℹ️  SQL needs to be run via Supabase Dashboard or CLI');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('MANUAL MIGRATION REQUIRED');
  console.log('='.repeat(60));
  console.log('\nThe Supabase JS client cannot execute DDL statements.');
  console.log('Please apply the migration manually using one of these methods:\n');
  console.log('1. Supabase Dashboard:');
  console.log('   - Go to https://supabase.com/dashboard');
  console.log('   - Navigate to SQL Editor');
  console.log('   - Paste the contents of: supabase/migrations/002_tracker_views.sql');
  console.log('   - Click "Run"\n');
  console.log('2. Supabase CLI:');
  console.log('   - Run: supabase db push\n');
  console.log('3. Direct psql connection (if you have it working):\n');
  console.log('   psql "$DATABASE_URL" < supabase/migrations/002_tracker_views.sql\n');

  // Output the SQL for easy copy-paste
  console.log('SQL to execute:');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
}

applyTrackerViews().catch(console.error);
