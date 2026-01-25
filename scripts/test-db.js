#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');

    // Test 1: List tables
    const { data: tables, error: tablesError } = await supabase
      .from('tours')
      .select('id, name')
      .limit(5);

    if (tablesError) {
      console.error('❌ Error querying tours:', tablesError.message);
      return;
    }

    console.log('✅ Connection successful!');
    console.log(`Found ${tables?.length || 0} tours`);

    if (tables && tables.length > 0) {
      console.log('\nTours:');
      tables.forEach(t => console.log(`  - ${t.name} (${t.id})`));
    }

    // Test 2: List all tables via RPC or information_schema
    const { data: allTables, error: schemaError } = await supabase
      .rpc('exec_sql', { sql_query: "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" })
      .then(r => r)
      .catch(() => ({ data: null, error: null }));

    if (!schemaError && allTables) {
      console.log('\n✅ Database tables:', allTables);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

testConnection();
