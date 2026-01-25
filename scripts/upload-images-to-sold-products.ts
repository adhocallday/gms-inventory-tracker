import * as fs from 'fs';
import * as path from 'path';
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function extractImagesFromPDF(pdfPath: string): Promise<string[]> {
  console.log(`📄 Reading PDF: ${pdfPath}`);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const images: string[] = [];

  console.log(`📊 PDF has ${pdf.numPages} pages`);
  const numPages = Math.min(pdf.numPages, 50);

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

      const dataUrl = canvas.toDataURL('image/png');
      images.push(dataUrl);
    } catch (pageError) {
      console.warn(`  ⚠️  Failed to render page ${pageNum}:`, pageError);
    }
  }

  console.log(`✅ Extracted ${images.length} page images\n`);
  return images;
}

async function main() {
  console.log('🚀 Uploading images to products with sales data\n');

  const tourId = '123e4567-e89b-12d3-a456-426614174000';
  const pdfPath = path.join(__dirname, '..', 'ghosttrackers', 'GHOST SUMMER 2025 SALES CHART.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF not found at: ${pdfPath}`);
    process.exit(1);
  }

  // 1. Extract images
  const images = await extractImagesFromPDF(pdfPath);

  // 2. Get products with sales (from product_summary_view)
  console.log('🔍 Finding products with sales data...');
  const { data: productSummary, error: summaryError } = await supabase
    .from('product_summary_view')
    .select('product_id, sku, description, total_sold')
    .eq('tour_id', tourId)
    .order('total_sold', { ascending: false });

  if (summaryError || !productSummary) {
    console.error('❌ Failed to fetch product summary:', summaryError);
    process.exit(1);
  }

  // Get unique products (product_summary_view may have multiple rows per product)
  const uniqueProducts = Array.from(
    new Map(productSummary.map(p => [p.product_id, p])).values()
  );

  console.log(`✅ Found ${uniqueProducts.length} products with sales\n`);

  // 3. Clear existing images
  console.log('🧹 Clearing existing product images...');
  await supabase.from('product_images').delete().eq('tour_id', tourId);
  console.log('✅ Cleared\n');

  // 4. Upload images to products with sales
  console.log('📤 Uploading images to products with sales...');
  let uploaded = 0;

  for (let i = 0; i < Math.min(uniqueProducts.length, images.length); i++) {
    const product = uniqueProducts[i];
    const imageDataUrl = images[i];

    console.log(`  [${i + 1}/${Math.min(uniqueProducts.length, images.length)}] ${product.sku} (${product.total_sold} sold) → Image ${i + 1}`);

    const { error: insertError } = await supabase
      .from('product_images')
      .insert({
        product_id: product.product_id,
        tour_id: tourId,
        image_type: 'grab_sheet',
        file_url: imageDataUrl,
        is_primary: true,
        display_order: 0
      });

    if (insertError) {
      console.error(`    ❌ Failed: ${insertError.message}`);
    } else {
      uploaded++;
    }
  }

  console.log(`\n✅ Upload complete! Uploaded ${uploaded} images`);
  console.log(`\n🎉 Images are now linked to products shown in reports!`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
