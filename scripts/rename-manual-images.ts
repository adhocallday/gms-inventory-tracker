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

  console.log('🔄 Renaming product images to include SKU and product name...\n');

  // 1. Get all image files sorted by filename
  const imageFiles = fs.readdirSync(imagesDir)
    .filter(file => file.endsWith('.png'))
    .sort();

  console.log(`✅ Found ${imageFiles.length} image files\n`);

  // 2. Get top products by sales (aggregated)
  console.log('📊 Fetching product data...');
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

  const topProducts = Object.values(aggregated)
    .sort((a: any, b: any) => b.total_sold - a.total_sold)
    .slice(0, imageFiles.length);

  console.log(`✅ Found ${topProducts.length} products\n`);

  // 3. Rename files
  console.log('✏️  Renaming files...\n');
  let renamed = 0;

  for (let i = 0; i < Math.min(topProducts.length, imageFiles.length); i++) {
    const product = topProducts[i];
    const oldFilename = imageFiles[i];

    // Clean product name for filename (remove special characters)
    const cleanName = product.description
      .replace(/[\/\\?%*:|"<>]/g, '-') // Replace invalid chars with dash
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .substring(0, 60); // Limit length

    const newFilename = `${product.sku} - ${cleanName}.png`;

    const oldPath = path.join(imagesDir, oldFilename);
    const newPath = path.join(imagesDir, newFilename);

    try {
      fs.renameSync(oldPath, newPath);
      console.log(`✅ Renamed: ${oldFilename}`);
      console.log(`   → ${newFilename}\n`);
      renamed++;
    } catch (error: any) {
      console.error(`❌ Failed to rename ${oldFilename}: ${error.message}\n`);
    }
  }

  console.log(`\n✅ Rename complete! Renamed ${renamed}/${imageFiles.length} files`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
