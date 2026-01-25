import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const tourId = '123e4567-e89b-12d3-a456-426614174000';

  console.log('🔍 Checking product_summary_view data...\n');

  const { data: summary, error } = await supabase
    .from('product_summary_view')
    .select('*')
    .eq('tour_id', tourId)
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Total rows: ${summary?.length || 0}\n`);

  console.log('First 10 rows:');
  summary?.forEach((row, i) => {
    console.log(`${i + 1}. SKU: ${row.sku}`);
    console.log(`   Product ID: ${row.product_id}`);
    console.log(`   Size: ${row.size || 'N/A'}`);
    console.log(`   Total Sold: ${row.total_sold}`);
    console.log(`   Total Gross: ${row.total_gross}`);
    console.log('');
  });
}

main();
