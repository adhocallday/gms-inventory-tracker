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

  console.log('🔍 Debugging product matching...\n');

  // Get ALL product_ids from product_summary_view
  const { data: summary } = await supabase
    .from('product_summary_view')
    .select('product_id, sku')
    .eq('tour_id', tourId);

  const uniqueSummary = Array.from(
    new Map(summary?.map(p => [p.product_id, p]) || []).values()
  );

  console.log(`Product Summary unique products: ${uniqueSummary.length}`);
  console.log('First 10 SKUs in summary:');
  uniqueSummary.slice(0, 10).forEach(p => {
    console.log(`  - ${p.sku} (${p.product_id})`);
  });

  // Get ALL product images
  const { data: images } = await supabase
    .from('product_images_detail')
    .select('product_id, sku')
    .eq('tour_id', tourId);

  console.log(`\nProduct Images: ${images?.length || 0}`);
  console.log('SKUs with images:');
  images?.forEach(img => {
    console.log(`  - ${img.sku} (${img.product_id})`);
  });

  // Check for matching product_ids
  const summaryIds = new Set(uniqueSummary.map(p => p.product_id));
  const imageIds = new Set(images?.map(img => img.product_id) || []);

  const matchingIds = Array.from(summaryIds).filter(id => imageIds.has(id));
  console.log(`\n✅ Matching product_ids: ${matchingIds.length}`);

  if (matchingIds.length > 0) {
    const matchedProducts = uniqueSummary.filter(p => matchingIds.includes(p.product_id));
    console.log('\nMatched products:');
    matchedProducts.forEach(p => {
      console.log(`  - ${p.sku} (${p.product_id})`);
    });
  } else {
    console.log('\n❌ NO MATCHES FOUND!');
    console.log('\nThis means the product_ids in product_summary_view do not match');
    console.log('the product_ids we uploaded images to.');
  }
}

main();
