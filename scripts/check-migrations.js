#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMigrations() {
  console.log('Checking applied migrations...\n');

  // Check if supabase_migrations table exists
  const { data: migrations, error } = await supabase
    .from('supabase_migrations')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error checking migrations:', error.message);
    console.log('\nsupabase_migrations table may not exist.');
  } else if (migrations && migrations.length > 0) {
    console.log('Applied migrations:');
    migrations.forEach(m => {
      console.log(`  - ${m.name || m.version} (${m.created_at})`);
    });
  } else {
    console.log('No migrations found in supabase_migrations table');
  }

  // Check if views exist by trying to query them
  console.log('\nChecking if views exist...');

  const viewsToCheck = [
    'product_summary_view',
    'show_summary_view',
    'inventory_balances',
    'po_open_qty_view',
    'stock_movement_view'
  ];

  for (const view of viewsToCheck) {
    const { data, error } = await supabase
      .from(view)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`  ❌ ${view}: Does not exist`);
    } else {
      console.log(`  ✅ ${view}: Exists`);
    }
  }
}

checkMigrations().catch(console.error);
