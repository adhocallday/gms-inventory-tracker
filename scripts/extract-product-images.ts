#!/usr/bin/env ts-node
/**
 * Extract product images from GHOST SUMMER 2025 SALES CHART.pdf
 * and upload them to the database for testing
 */

import * as fs from 'fs';
import * as path from 'path';
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Extract images from PDF pages
 */
async function extractImagesFromPDF(pdfPath: string): Promise<string[]> {
  console.log(`📄 Reading PDF: ${pdfPath}`);

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const images: string[] = [];

  console.log(`📊 PDF has ${pdf.numPages} pages`);
  const numPages = Math.min(pdf.numPages, 50); // Limit to 50 pages

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      console.log(`  Rendering page ${pageNum}/${numPages}...`);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context as any,
        viewport: viewport
      }).promise;

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');
      images.push(dataUrl);
    } catch (pageError) {
      console.warn(`  ⚠️  Failed to render page ${pageNum}:`, pageError);
    }
  }

  console.log(`✅ Extracted ${images.length} page images\n`);
  return images;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting product image extraction\n');

  // 1. Extract images from PDF
  const pdfPath = path.join(__dirname, '..', 'ghosttrackers', 'GHOST SUMMER 2025 SALES CHART.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF not found at: ${pdfPath}`);
    process.exit(1);
  }

  const images = await extractImagesFromPDF(pdfPath);

  // 2. Find Ghost 2025 tour
  console.log('🔍 Finding Ghost tour...');

  // First list all tours to see what's available
  const { data: allTours } = await supabase
    .from('tours')
    .select('id, name, artist')
    .limit(10);

  console.log('Available tours:');
  allTours?.forEach(t => console.log(`  - ${t.name} by ${t.artist} (${t.id})`));
  console.log('');

  const { data: tours, error: tourError } = await supabase
    .from('tours')
    .select('*')
    .or('name.ilike.%ghost%,artist.ilike.%ghost%')
    .limit(1);

  if (tourError || !tours || tours.length === 0) {
    console.error('❌ Ghost tour not found');
    console.error('Try creating a tour first or update the search criteria');
    process.exit(1);
  }

  const tour = tours[0];
  console.log(`✅ Using tour: ${tour.name} by ${tour.artist} (${tour.id})\n`);

  // 3. Find all products for this tour
  console.log('🔍 Finding products...');
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .order('sku', { ascending: true });

  if (productsError || !products) {
    console.error('❌ Failed to fetch products:', productsError);
    process.exit(1);
  }

  console.log(`✅ Found ${products.length} products\n`);

  // 4. Clear existing product images for this tour
  console.log('🧹 Clearing existing product images...');
  const { error: deleteError } = await supabase
    .from('product_images')
    .delete()
    .eq('tour_id', tour.id);

  if (deleteError) {
    console.warn('⚠️  Failed to clear existing images:', deleteError.message);
  } else {
    console.log('✅ Cleared existing images\n');
  }

  // 5. Upload images to database
  console.log('📤 Uploading product images...');
  let uploaded = 0;
  let skipped = 0;

  for (let i = 0; i < Math.min(products.length, images.length); i++) {
    const product = products[i];
    const imageDataUrl = images[i];

    console.log(`  [${i + 1}/${Math.min(products.length, images.length)}] ${product.sku} → Image ${i + 1}`);

    const { error: insertError } = await supabase
      .from('product_images')
      .insert({
        product_id: product.id,
        tour_id: tour.id,
        image_type: 'grab_sheet',
        file_url: imageDataUrl,
        is_primary: true,
        display_order: 0
      });

    if (insertError) {
      console.error(`    ❌ Failed: ${insertError.message}`);
      skipped++;
    } else {
      uploaded++;
    }
  }

  console.log(`\n✅ Upload complete!`);
  console.log(`   Uploaded: ${uploaded} images`);
  console.log(`   Skipped: ${skipped} images`);
  console.log(`\n🎉 Product images are now available in reports!`);
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
