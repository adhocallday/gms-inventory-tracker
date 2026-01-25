import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Check the #1 top product shown in report
  const productId = '223e4567-e89b-12d3-a456-426614174003';

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  const { data: image } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle();

  console.log('\n🔍 Checking top product in report:\n');
  console.log(`SKU: ${product?.sku}`);
  console.log(`Description: ${product?.description}`);
  console.log(`Has image: ${image ? '✅ YES' : '❌ NO'}`);

  if (image) {
    console.log(`Image type: ${image.image_type}`);
    console.log(`File URL length: ${image.file_url?.length.toLocaleString()} characters`);
    console.log(`Is primary: ${image.is_primary ? 'Yes' : 'No'}`);
  }
}

main();
