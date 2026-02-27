import { NextRequest, NextResponse } from 'next/server';
import { parseDocument, parseText } from '@/lib/ai/claude-client';
import { createServiceClient } from '@/lib/supabase/client';
import { parseSpreadsheet, spreadsheetToText, isSpreadsheetFile } from '@/lib/parsers/spreadsheet-parser';
import { uploadProductImages } from '@/lib/storage/product-images';
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

// JSON Schema for product extraction (enables fast Haiku parsing)
const PRODUCTS_SCHEMA = {
  type: 'object',
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'Product SKU/item code, uppercase' },
          name: { type: 'string', description: 'Product name/description' },
          category: { type: 'string', description: 'Category: T-Shirt, Long-Sleeve, Hoodie, Sweatshirt, Tank, Poster, Vinyl, CD, Accessory, Hat, Bag, or Other' },
          basePrice: { type: 'number', description: 'Base retail price as number' },
          sizes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Available sizes: S, M, L, XL, 2XL, 3XL, or One-Size'
          }
        },
        required: ['sku', 'name', 'category', 'basePrice', 'sizes']
      }
    }
  },
  required: ['products']
};

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
 * Handle spreadsheet files (CSV, Excel) - much faster than document parsing
 */
async function handleSpreadsheetFile(
  buffer: Buffer,
  filename: string,
  tourName: string,
  existingProducts: Product[]
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Parse spreadsheet to structured data
    const rows = parseSpreadsheet(buffer, filename);

    if (rows.length === 0) {
      return NextResponse.json({
        products: [],
        totalExtracted: 0,
        validProducts: 0,
        duplicatesFiltered: 0,
        imagesExtracted: 0
      });
    }

    // Convert to text for Claude parsing
    const spreadsheetText = spreadsheetToText(rows);
    console.log(`[Parse Products] Spreadsheet has ${rows.length} rows`);

    // Create instructions for Claude
    const instructions = `You are analyzing spreadsheet data containing product catalog information for "${tourName}".

The data is in tabular format with columns separated by " | ".

Extract all merchandise products and return them as structured JSON.

For each product, extract:
- sku: Product SKU/item code (uppercase)
- name: Product name/description
- category: One of: T-Shirt, Long-Sleeve, Hoodie, Sweatshirt, Tank, Poster, Vinyl, CD, Accessory, Hat, Bag, Other
- basePrice: Base retail price as a number
- sizes: Array of sizes: S, M, L, XL, 2XL, 3XL, or One-Size

${existingProducts.length > 0 ? `\nEXISTING PRODUCTS (avoid duplicates):\n${existingProducts.map(p => `- ${p.sku}`).join('\n')}` : ''}`;

    // Use Haiku with schema for fast, reliable parsing
    const parsedResponse = await parseText(spreadsheetText, instructions, PRODUCTS_SCHEMA);

    console.log(`[Parse Products] Spreadsheet parsing: ${Date.now() - startTime}ms`);
    console.log(`[Parse Products] Extracted ${parsedResponse.products?.length || 0} products`);

    // Validate products
    const validProducts = (parsedResponse.products || []).filter((product: any) =>
      product.sku &&
      product.name &&
      product.category &&
      typeof product.basePrice === 'number' &&
      Array.isArray(product.sizes) &&
      product.sizes.length > 0
    );

    // Filter duplicates
    const existingSKUs = new Set(existingProducts.map(p => p.sku));
    const newProducts = validProducts.filter((product: Product) => !existingSKUs.has(product.sku));

    return NextResponse.json({
      products: newProducts,
      totalExtracted: parsedResponse.products?.length || 0,
      validProducts: validProducts.length,
      duplicatesFiltered: validProducts.length - newProducts.length,
      imagesExtracted: 0 // No images from spreadsheets
    });
  } catch (error: any) {
    console.error('[Parse Products] Spreadsheet parsing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse spreadsheet' },
      { status: 500 }
    );
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
    const tourId = formData.get('tourId') as string; // Optional: for image storage

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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Parse Products] Analyzing ${file.name} (${(file.size / 1024).toFixed(1)} KB) for ${tourName}`);

    // Check if this is a spreadsheet file (CSV, Excel)
    if (isSpreadsheetFile(file.type, file.name)) {
      console.log('[Parse Products] Detected spreadsheet file, using fast parsing');
      return handleSpreadsheetFile(buffer, file.name, tourName, existingProducts);
    }

    const base64Data = buffer.toString('base64');

    // Determine media type for PDF/image files
    let mediaType: 'application/pdf' | 'image/jpeg' | 'image/png' = 'application/pdf';
    if (file.type.includes('image/jpeg') || file.type.includes('image/jpg')) {
      mediaType = 'image/jpeg';
    } else if (file.type.includes('image/png')) {
      mediaType = 'image/png';
    }

    console.log(`[Parse Products] Using ${mediaType === 'application/pdf' ? 'PDF' : 'image'} parsing`);

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

    // Parse document with Claude
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

    // Map products with their extracted images
    const productsWithImages = newProducts.map((product, index) => ({
      ...product,
      imageDataUrl: productImages[index] || null
    }));

    // If tourId provided, persist images to Supabase Storage
    let persistedImageUrls: (string | null)[] = [];
    if (tourId && productImages.length > 0) {
      console.log(`[Parse Products] Persisting ${productImages.length} images to storage for tour ${tourId}`);
      const imagesToUpload = productsWithImages
        .filter(p => p.imageDataUrl)
        .map(p => ({
          dataUrl: p.imageDataUrl!,
          sku: p.sku
        }));

      persistedImageUrls = await uploadProductImages(imagesToUpload, tourId);

      // Update products with persisted URLs
      let urlIndex = 0;
      for (const product of productsWithImages) {
        if (product.imageDataUrl) {
          (product as any).persistedImageUrl = persistedImageUrls[urlIndex] || null;
          urlIndex++;
        }
      }
    }

    return NextResponse.json({
      products: productsWithImages,
      totalExtracted: parsedResponse.products.length,
      validProducts: validProducts.length,
      duplicatesFiltered: validProducts.length - newProducts.length,
      imagesExtracted: productImages.length,
      imagesPersisted: persistedImageUrls.filter(u => u !== null).length
    });
  } catch (error: any) {
    console.error('[Parse Products] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse products' },
      { status: 500 }
    );
  }
}
