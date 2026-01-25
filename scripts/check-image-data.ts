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

  console.log('🔍 Checking image data validity...\n');

  const { data: images, error } = await supabase
    .from('product_images_detail')
    .select('sku, product_id, file_url')
    .eq('tour_id', tourId)
    .eq('is_primary', true)
    .limit(3);

  if (error) {
    console.error('❌ Error fetching images:', error);
    return;
  }

  if (!images || images.length === 0) {
    console.log('❌ No images found');
    return;
  }

  console.log(`✅ Found ${images.length} images\n`);

  images.forEach((img, index) => {
    console.log(`Image ${index + 1}:`);
    console.log(`  SKU: ${img.sku}`);
    console.log(`  Product ID: ${img.product_id}`);
    if (img.file_url) {
      console.log(`  URL starts with: ${img.file_url.substring(0, 50)}...`);
      console.log(`  URL length: ${img.file_url.length.toLocaleString()} characters`);
      console.log(`  Is base64 PNG: ${img.file_url.startsWith('data:image/png;base64,')}`);
      console.log(`  Size in MB: ${(img.file_url.length / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log(`  ❌ No file_url!`);
    }
    console.log('');
  });
}

main();
