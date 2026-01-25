import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const tourId = '123e4567-e89b-12d3-a456-426614174000';
  const imagesDir = path.join(__dirname, '..', 'Product Image Extrated Manual');

  console.log('🚀 Uploading corrected product images to database...\n');

  // 1. Get all image files
  const imageFiles = fs.readdirSync(imagesDir)
    .filter(file => file.endsWith('.png'))
    .sort();

  console.log(`✅ Found ${imageFiles.length} image files\n`);

  // 2. Extract SKU from filename (format: "SKU - Product Name.png")
  const imageMappings = imageFiles.map(filename => {
    const sku = filename.split(' - ')[0];
    return { filename, sku };
  });

  // 3. Get product data from database
  console.log('📊 Fetching product data...');
  const { data: sizeLevelData } = await supabase
    .from('product_summary_view')
    .select('product_id, sku, description')
    .eq('tour_id', tourId);

  // Create unique products by product_id
  const uniqueProducts = Array.from(
    new Map(sizeLevelData?.map(p => [p.product_id, p]) || []).values()
  );

  const productMap = new Map(
    uniqueProducts.map(p => [p.sku, p])
  );

  console.log(`✅ Loaded ${productMap.size} products\n`);

  // 4. Clear existing product images
  console.log('🧹 Clearing existing product images...');
  await supabase.from('product_images').delete().eq('tour_id', tourId);
  console.log('✅ Cleared\n');

  // 5. Upload images
  console.log('📤 Uploading images...\n');
  let uploaded = 0;
  let skipped = 0;

  for (const { filename, sku } of imageMappings) {
    const product = productMap.get(sku);

    if (!product) {
      console.log(`⚠️  [${uploaded + skipped + 1}/${imageFiles.length}] ${sku} not found in database, skipping`);
      skipped++;
      continue;
    }

    const imagePath = path.join(imagesDir, filename);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    console.log(`  [${uploaded + skipped + 1}/${imageFiles.length}] ${product.sku}`);
    console.log(`    → ${product.description}`);
    console.log(`    → ${filename} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);

    const { error } = await supabase
      .from('product_images')
      .insert({
        product_id: product.product_id,
        tour_id: tourId,
        image_type: 'grab_sheet',
        file_url: dataUrl,
        is_primary: true,
        display_order: 0
      });

    if (error) {
      console.error(`    ❌ Failed: ${error.message}`);
      skipped++;
    } else {
      uploaded++;
      console.log(`    ✅ Uploaded`);
    }
    console.log('');
  }

  console.log(`\n✅ Upload complete!`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${imageFiles.length}`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
