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

  console.log('🔍 Checking report data sources...\n');

  // Check product summary
  const { data: productSummary } = await supabase
    .from('product_summary_view')
    .select('*')
    .eq('tour_id', tourId)
    .limit(3);

  console.log('Product Summary (first 3):');
  productSummary?.forEach(p => {
    console.log(`  - SKU: ${p.sku}, Product ID: ${p.product_id}, Total Sold: ${p.total_sold}`);
  });

  // Check product images detail
  const { data: productImages } = await supabase
    .from('product_images_detail')
    .select('*')
    .eq('tour_id', tourId)
    .eq('is_primary', true)
    .limit(3);

  console.log('\nProduct Images Detail (first 3):');
  productImages?.forEach(img => {
    console.log(`  - SKU: ${img.sku}, Product ID: ${img.product_id}, Has file_url: ${!!img.file_url}, URL length: ${img.file_url?.length || 0}`);
  });

  // Check if there's a match
  console.log('\n🔍 Checking for product_id matches:');
  const summaryProductIds = new Set(productSummary?.map(p => p.product_id) || []);
  const imageProductIds = new Set(productImages?.map(img => img.product_id) || []);

  console.log(`Product Summary product_ids: ${Array.from(summaryProductIds).slice(0, 3).join(', ')}`);
  console.log(`Product Images product_ids: ${Array.from(imageProductIds).slice(0, 3).join(', ')}`);

  const matches = Array.from(summaryProductIds).filter(id => imageProductIds.has(id));
  console.log(`\n✅ Matching product_ids: ${matches.length}`);
  if (matches.length > 0) {
    console.log(`   Sample matches: ${matches.slice(0, 3).join(', ')}`);
  }
}

main();
