import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import Tesseract from 'tesseract.js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function extractSKUFromImage(imagePath: string): Promise<string | null> {
  console.log(`  🔍 Reading text from image...`);

  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: () => {} // Suppress verbose logging
    });

    // Look for SKU patterns like GHOSRX203730BK, GHOSNS903311BK, GHOSCG103805PU
    const skuPattern = /GHOS[A-Z]{2}[0-9]{6}[A-Z]{2}/g;
    const matches = text.match(skuPattern);

    if (matches && matches.length > 0) {
      // Return the first match (usually the main SKU)
      console.log(`  ✅ Found SKU: ${matches[0]}`);
      return matches[0];
    }

    console.log(`  ⚠️  No SKU pattern found in text`);
    return null;
  } catch (error) {
    console.error(`  ❌ OCR error:`, error);
    return null;
  }
}

async function main() {
  const tourId = '123e4567-e89b-12d3-a456-426614174000';
  const imagesDir = path.join(__dirname, '..', 'Product Image Extrated Manual');

  console.log('🔍 Using OCR to identify products in images...\n');

  // Get all image files
  const imageFiles = fs.readdirSync(imagesDir)
    .filter(file => file.endsWith('.png'))
    .sort();

  console.log(`✅ Found ${imageFiles.length} image files\n`);

  // Get all products from database
  console.log('📊 Fetching product data from database...');
  const { data: sizeLevelData } = await supabase
    .from('product_summary_view')
    .select('product_id, sku, description, total_sold')
    .eq('tour_id', tourId);

  if (!sizeLevelData || sizeLevelData.length === 0) {
    console.error('❌ No product data found');
    return;
  }

  // Create SKU lookup map
  const skuMap = new Map();
  sizeLevelData.forEach(row => {
    if (!skuMap.has(row.sku)) {
      skuMap.set(row.sku, {
        sku: row.sku,
        description: row.description,
        product_id: row.product_id
      });
    }
  });

  console.log(`✅ Loaded ${skuMap.size} unique products\n`);

  // Process each image
  console.log('🔍 Processing images with OCR...\n');
  let renamed = 0;
  let failed = 0;

  for (const filename of imageFiles) {
    const imagePath = path.join(imagesDir, filename);

    console.log(`\n📷 Processing: ${filename}`);

    // Extract SKU from image using OCR
    const detectedSKU = await extractSKUFromImage(imagePath);

    if (!detectedSKU) {
      console.log(`  ⚠️  Could not detect SKU, skipping...`);
      failed++;
      continue;
    }

    // Look up product in database
    const product = skuMap.get(detectedSKU);

    if (!product) {
      console.log(`  ⚠️  SKU ${detectedSKU} not found in database, skipping...`);
      failed++;
      continue;
    }

    // Clean product name for filename
    const cleanName = product.description
      .replace(/[\/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 60);

    const newFilename = `${product.sku} - ${cleanName}.png`;

    // Check if already correctly named
    if (filename === newFilename) {
      console.log(`  ✅ Already correctly named`);
      renamed++;
      continue;
    }

    const newPath = path.join(imagesDir, newFilename);

    // Rename file
    try {
      fs.renameSync(imagePath, newPath);
      console.log(`  ✅ Renamed to: ${newFilename}`);
      renamed++;
    } catch (error: any) {
      console.error(`  ❌ Failed to rename: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n\n✅ Complete!`);
  console.log(`   Renamed: ${renamed}/${imageFiles.length}`);
  console.log(`   Failed: ${failed}/${imageFiles.length}`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
