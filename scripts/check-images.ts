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

  console.log('🔍 Checking product images in database...\n');

  const { data, error } = await supabase
    .from('product_images')
    .select('id, product_id, image_type, is_primary')
    .eq('tour_id', tourId);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Found ${data?.length || 0} product images`);

  if (data && data.length > 0) {
    console.log('\nFirst 5 images:');
    data.slice(0, 5).forEach((img, i) => {
      console.log(`  ${i + 1}. Product ID: ${img.product_id}, Type: ${img.image_type}, Primary: ${img.is_primary}`);
    });
  }

  // Check product_images_detail view
  const { data: detailData, error: detailError } = await supabase
    .from('product_images_detail')
    .select('sku, image_type, is_primary')
    .eq('tour_id', tourId)
    .limit(5);

  if (!detailError && detailData) {
    console.log('\nProduct images with SKUs:');
    detailData.forEach((img, i) => {
      console.log(`  ${i + 1}. SKU: ${img.sku}, Type: ${img.image_type}, Primary: ${img.is_primary}`);
    });
  }
}

main();
