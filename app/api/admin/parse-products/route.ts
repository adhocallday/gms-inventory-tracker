import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/ai/claude-client';
import { createServiceClient } from '@/lib/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Product {
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  sizes: string[];
  imageUrl?: string;
}

interface ProductWithImage extends Product {
  imageDataUrl?: string;
}

/**
 * Extract images from PDF pages
 */
async function extractProductImagesFromPDF(buffer: Buffer): Promise<string[]> {
  try {
    const pdfData = new Uint8Array(buffer);
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const images: string[] = [];

    // Extract first 50 pages (or all pages if less than 50)
    const numPages = Math.min(pdf.numPages, 50);

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
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
        console.warn(`[Extract Images] Failed to render page ${pageNum}:`, pageError);
      }
    }

    return images;
  } catch (error) {
    console.error('[Extract Images] Error:', error);
    return [];
  }
}

/**
 * POST /api/admin/parse-products
 * Parse product catalog from PDF, CSV, Excel, or image
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tourName = formData.get('tourName') as string;
    const productsJson = formData.get('products') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse existing products for context (to avoid duplicates)
    let existingProducts: Product[] = [];
    if (productsJson) {
      try {
        existingProducts = JSON.parse(productsJson);
      } catch (e) {
        console.warn('[Parse Products] Failed to parse existing products:', e);
      }
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    // Determine media type
    let mediaType: 'application/pdf' | 'image/jpeg' | 'image/png' = 'application/pdf';
    if (file.type.includes('image/jpeg') || file.type.includes('image/jpg')) {
      mediaType = 'image/jpeg';
    } else if (file.type.includes('image/png')) {
      mediaType = 'image/png';
    }

    console.log(`[Parse Products] Analyzing ${file.name} (${(file.size / 1024).toFixed(1)} KB) for ${tourName}`);

    // Create instructions for Claude
    const instructions = `You are analyzing a document containing product catalog information for "${tourName}".

Extract all merchandise products from this document and return them as a structured JSON array.

For each product, extract:
- sku: Product SKU/item code (e.g., "GHOSRX203729BK", "TSH-001")
- name: Product name/description (e.g., "Black T-Shirt Skeleton Tour", "Ghost Hoodie")
- category: Product category (e.g., "T-Shirt", "Hoodie", "Poster", "Vinyl", "Accessory")
- basePrice: Base retail price as a number (e.g., 30.00, not "$30")
- sizes: Array of available sizes (e.g., ["S", "M", "L", "XL", "2XL", "3XL"] or ["One-Size"])
- imageUrl: If this is an image of a product, return null (images will be handled separately)

IMPORTANT GUIDELINES:
- SKU should be uppercase and preserve any special characters
- Category should be one of: T-Shirt, Long-Sleeve, Hoodie, Sweatshirt, Tank, Poster, Vinyl, CD, Accessory, Hat, Bag, Other
- basePrice must be a number (no currency symbols)
- sizes should use standard abbreviations: S, M, L, XL, 2XL, 3XL, One-Size
- For non-apparel items (posters, vinyl, etc.), use ["One-Size"]

${existingProducts.length > 0 ? `\nEXISTING PRODUCTS (avoid duplicates):\n${existingProducts.map(p => `- ${p.sku}: ${p.name}`).join('\n')}` : ''}

Return ONLY a valid JSON object (no markdown formatting):
{
  "products": [
    {
      "sku": "GHOSRX203729BK",
      "name": "Black T-Shirt Skeleton Tour",
      "category": "T-Shirt",
      "basePrice": 30.00,
      "sizes": ["S", "M", "L", "XL", "2XL", "3XL"]
    }
  ]
}

If no products are found, return: {"products": []}`;

    const parsedResponse = await parseDocument(base64Data, mediaType, instructions);

    console.log(`[Parse Products] Successfully extracted ${parsedResponse.products?.length || 0} products`);

    // Validate the response
    if (!parsedResponse.products || !Array.isArray(parsedResponse.products)) {
      console.error('[Parse Products] Invalid response format:', parsedResponse);
      return NextResponse.json(
        { error: 'Failed to extract product data from document' },
        { status: 500 }
      );
    }

    // Validate each product has required fields
    const validProducts = parsedResponse.products.filter((product: any) =>
      product.sku &&
      product.name &&
      product.category &&
      typeof product.basePrice === 'number' &&
      Array.isArray(product.sizes) &&
      product.sizes.length > 0
    );

    if (validProducts.length < parsedResponse.products.length) {
      console.warn(`[Parse Products] Filtered out ${parsedResponse.products.length - validProducts.length} invalid products`);
    }

    // Filter out duplicates based on existing SKUs
    const existingSKUs = new Set(existingProducts.map(p => p.sku));
    const newProducts = validProducts.filter((product: Product) => !existingSKUs.has(product.sku));

    console.log(`[Parse Products] Returning ${newProducts.length} new products (${validProducts.length - newProducts.length} duplicates filtered)`);

    // Extract product images from PDF if it's a PDF file
    let productImages: string[] = [];
    if (mediaType === 'application/pdf' && buffer) {
      console.log('[Parse Products] Extracting images from PDF...');
      productImages = await extractProductImagesFromPDF(buffer);
      console.log(`[Parse Products] Extracted ${productImages.length} page images`);
    }

    // Return products with images for client-side storage
    const productsWithImages = newProducts.map((product, index) => ({
      ...product,
      // Assign first N images to first N products (client can match better)
      imageDataUrl: productImages[index] || null
    }));

    return NextResponse.json({
      products: productsWithImages,
      totalExtracted: parsedResponse.products.length,
      validProducts: validProducts.length,
      duplicatesFiltered: validProducts.length - newProducts.length,
      imagesExtracted: productImages.length
    });
  } catch (error: any) {
    console.error('[Parse Products] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse products' },
      { status: 500 }
    );
  }
}
