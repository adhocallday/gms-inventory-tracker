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

  console.log('🔍 Finding top-selling products...\n');

  // Get all SIZE-LEVEL data from product_summary_view
  const { data: sizeLevelData } = await supabase
    .from('product_summary_view')
    .select('product_id, sku, total_sold, total_gross')
    .eq('tour_id', tourId);

  if (!sizeLevelData || sizeLevelData.length === 0) {
    console.log('❌ No data found');
    return;
  }

  // Aggregate by SKU (sum across all sizes)
  const aggregated = sizeLevelData.reduce((acc, row) => {
    const key = row.product_id;
    if (!acc[key]) {
      acc[key] = {
        product_id: row.product_id,
        sku: row.sku,
        total_sold: 0,
        total_gross: 0
      };
    }
    acc[key].total_sold += row.total_sold || 0;
    acc[key].total_gross += row.total_gross || 0;
    return acc;
  }, {} as Record<string, any>);

  const aggregatedArray = Object.values(aggregated);
  aggregatedArray.sort((a, b) => b.total_sold - a.total_sold);

  // Get products with images
  const { data: imagesData } = await supabase
    .from('product_images_detail')
    .select('product_id, sku')
    .eq('tour_id', tourId)
    .eq('is_primary', true);

  const productIdsWithImages = new Set(imagesData?.map(img => img.product_id) || []);

  console.log('Top 15 products by total sales (aggregated across all sizes):\n');
  aggregatedArray.slice(0, 15).forEach((product, index) => {
    const hasImage = productIdsWithImages.has(product.product_id);
    const icon = hasImage ? '✅' : '❌';
    console.log(`${index + 1}. ${icon} ${product.sku}`);
    console.log(`   Total Sold: ${product.total_sold.toLocaleString()} units`);
    console.log(`   Total Gross: $${product.total_gross.toLocaleString()}`);
    console.log(`   ${hasImage ? 'HAS IMAGE' : 'NO IMAGE'}`);
    console.log('');
  });

  const top15WithImages = aggregatedArray.slice(0, 15).filter(p => productIdsWithImages.has(p.product_id)).length;
  console.log(`\n${top15WithImages}/15 of top products have images`);
}

main();
