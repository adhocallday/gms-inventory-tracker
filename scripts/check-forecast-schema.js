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
  console.log('Checking forecast tables schema...\n');

  // Check forecast_scenarios
  const { data: scenarios, error: scenariosError } = await supabase
    .from('forecast_scenarios')
    .select('*')
    .limit(1);

  if (scenariosError) {
    console.error('Error querying forecast_scenarios:', scenariosError);
  } else if (scenarios && scenarios.length > 0) {
    console.log('Sample forecast_scenarios record:');
    console.log(scenarios[0]);
    console.log('\nColumns:', Object.keys(scenarios[0]));
  } else {
    console.log('No records in forecast_scenarios');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Check forecast_overrides
  const { data: overrides, error: overridesError } = await supabase
    .from('forecast_overrides')
    .select('*')
    .limit(1);

  if (overridesError) {
    console.error('Error querying forecast_overrides:', overridesError);
  } else if (overrides && overrides.length > 0) {
    console.log('Sample forecast_overrides record:');
    console.log(overrides[0]);
    console.log('\nColumns:', Object.keys(overrides[0]));
  } else {
    console.log('No records in forecast_overrides');
  }
}

checkSchema().catch(console.error);
