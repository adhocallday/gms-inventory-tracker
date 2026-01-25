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

  console.log('🔍 Verifying image-to-product mapping in database...\n');

  // Get products with images from database
  const { data: imagesData } = await supabase
    .from('product_images_detail')
    .select('*')
    .eq('tour_id', tourId)
    .eq('is_primary', true)
    .order('created_at', { ascending: true });

  console.log(`✅ Found ${imagesData?.length || 0} images in database\n`);

  if (!imagesData || imagesData.length === 0) {
    console.log('❌ No images found');
    return;
  }

  // Get actual sales data
  const { data: sizeLevelData } = await supabase
    .from('product_summary_view')
    .select('product_id, sku, description, total_sold, total_gross')
    .eq('tour_id', tourId);

  if (!sizeLevelData || sizeLevelData.length === 0) {
    console.error('❌ No product data found');
    return;
  }

  // Aggregate by product_id
  const aggregated = sizeLevelData.reduce((acc, row) => {
    const key = row.product_id;
    if (!acc[key]) {
      acc[key] = {
        product_id: row.product_id,
        sku: row.sku,
        description: row.description,
        total_sold: 0,
        total_gross: 0
      };
    }
    acc[key].total_sold += row.total_sold || 0;
    acc[key].total_gross += row.total_gross || 0;
    return acc;
  }, {} as Record<string, any>);

  const productMap = new Map(
    Object.values(aggregated).map((p: any) => [p.product_id, p])
  );

  // Check each image
  console.log('Image → Product Mapping:\n');
  imagesData.forEach((img, index) => {
    const product = productMap.get(img.product_id);
    console.log(`${index + 1}. Image for: ${img.sku}`);
    console.log(`   Product in DB: ${img.product_description}`);
    if (product) {
      console.log(`   Sales data: ${product.total_sold.toLocaleString()} units sold`);
      console.log(`   Match: ${img.sku === product.sku ? '✅ CORRECT' : '❌ MISMATCH'}`);
    } else {
      console.log(`   ⚠️  No sales data found for this product`);
    }
    console.log('');
  });

  // Show top 10 products by sales and whether they have images
  console.log('\nTop 10 Products by Sales:\n');
  const topProducts = Object.values(aggregated)
    .sort((a: any, b: any) => b.total_sold - a.total_sold)
    .slice(0, 10);

  const imageProductIds = new Set(imagesData.map(img => img.product_id));

  topProducts.forEach((product: any, index) => {
    const hasImage = imageProductIds.has(product.product_id);
    console.log(`${index + 1}. ${hasImage ? '✅' : '❌'} ${product.sku}`);
    console.log(`   ${product.description}`);
    console.log(`   ${product.total_sold.toLocaleString()} units sold`);
    console.log('');
  });
}

main();
