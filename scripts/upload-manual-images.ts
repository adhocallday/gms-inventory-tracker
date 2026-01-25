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

  console.log('🚀 Uploading manually extracted product images...\n');

  // 1. Get all image files sorted by filename
  const imageFiles = fs.readdirSync(imagesDir)
    .filter(file => file.endsWith('.png'))
    .sort(); // Sort alphabetically by filename

  console.log(`✅ Found ${imageFiles.length} image files\n`);

  // 2. Get top products by sales (aggregated)
  console.log('📊 Fetching top-selling products...');
  const { data: sizeLevelData } = await supabase
    .from('product_summary_view')
    .select('product_id, sku, description, total_sold, total_gross')
    .eq('tour_id', tourId);

  if (!sizeLevelData || sizeLevelData.length === 0) {
    console.error('❌ No product data found');
    return;
  }

  // Aggregate by product_id (sum across sizes)
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

  const topProducts = Object.values(aggregated)
    .sort((a: any, b: any) => b.total_sold - a.total_sold)
    .slice(0, imageFiles.length);

  console.log(`✅ Found ${topProducts.length} products\n`);

  // 3. Clear existing product images
  console.log('🧹 Clearing existing product images...');
  await supabase.from('product_images').delete().eq('tour_id', tourId);
  console.log('✅ Cleared\n');

  // 4. Upload images to top products
  console.log('📤 Uploading images to products...\n');
  let uploaded = 0;

  for (let i = 0; i < Math.min(topProducts.length, imageFiles.length); i++) {
    const product = topProducts[i];
    const imageFile = imageFiles[i];
    const imagePath = path.join(imagesDir, imageFile);

    // Read image file and convert to base64 data URL
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    console.log(`  [${i + 1}/${imageFiles.length}] ${product.sku}`);
    console.log(`    → ${product.description}`);
    console.log(`    → ${product.total_sold.toLocaleString()} units sold`);
    console.log(`    → ${imageFile} (${(imageBuffer.length / 1024).toFixed(1)} KB)`);

    const { error: insertError } = await supabase
      .from('product_images')
      .insert({
        product_id: product.product_id,
        tour_id: tourId,
        image_type: 'grab_sheet',
        file_url: dataUrl,
        is_primary: true,
        display_order: 0
      });

    if (insertError) {
      console.error(`    ❌ Failed: ${insertError.message}`);
    } else {
      uploaded++;
      console.log(`    ✅ Uploaded`);
    }
    console.log('');
  }

  console.log(`\n✅ Upload complete! Uploaded ${uploaded}/${imageFiles.length} images`);
  console.log(`\n🎉 Product images are now linked to top-selling products!`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
