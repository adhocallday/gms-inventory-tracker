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

async function checkSchema() {
  console.log('Checking sales table schema...\n');

  const { data: existing, error } = await supabase
    .from('sales')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else if (existing && existing.length > 0) {
    console.log('Sample record from sales table:');
    console.log(existing[0]);
    console.log('\nColumns:', Object.keys(existing[0]));
  } else {
    console.log('No records found in sales table');

    // Try inserting a test record to see what columns are expected
    const testRecord = {
      tour_id: '123e4567-e89b-12d3-a456-426614174000',
      show_id: '423e4567-e89b-12d3-a456-426614174001',
      tour_product_id: 'b2d34e17-8c96-4c55-b195-a7489ce8d90e',
      quantity: 10
    };

    const { error: insertError } = await supabase
      .from('sales')
      .insert(testRecord);

    console.log('Test insert error (to see expected schema):', insertError);
  }
}

checkSchema().catch(console.error);
