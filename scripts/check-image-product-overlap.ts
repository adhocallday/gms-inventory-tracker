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

  console.log('🔍 Checking if products shown in reports have images...\n');

  // Get products that appear in reports (from product_summary_view, which is what reports display)
  const { data: reportProducts } = await supabase
    .from('product_summary_view')
    .select('product_id, sku, total_sold')
    .eq('tour_id', tourId)
    .order('total_sold', { ascending: false });

  // Get products with images
  const { data: imagesData } = await supabase
    .from('product_images_detail')
    .select('product_id, sku')
    .eq('tour_id', tourId)
    .eq('is_primary', true);

  const productIdsWithImages = new Set(imagesData?.map(img => img.product_id) || []);

  console.log(`Total products in report: ${reportProducts?.length || 0}`);
  console.log(`Total products with images: ${imagesData?.length || 0}\n`);

  console.log('Top 10 products in report (sorted by sales):');
  reportProducts?.slice(0, 10).forEach((product, index) => {
    const hasImage = productIdsWithImages.has(product.product_id);
    const icon = hasImage ? '✅' : '❌';
    console.log(`  ${index + 1}. ${icon} ${product.sku} (${product.total_sold} sold) - ${hasImage ? 'HAS IMAGE' : 'NO IMAGE'}`);
  });

  const top10WithImages = reportProducts?.slice(0, 10).filter(p => productIdsWithImages.has(p.product_id)).length || 0;
  console.log(`\n${top10WithImages}/10 of top products have images`);
}

main();
