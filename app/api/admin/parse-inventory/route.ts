import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/ai/claude-client';

interface InventoryItem {
  sku: string;
  size: string;
  location: string;
  quantity: number;
}

interface Product {
  sku: string;
  sizes: string[];
}

/**
 * POST /api/admin/parse-inventory
 * Parse initial inventory from CSV or Excel spreadsheet
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productsJson = formData.get('products') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Parse products for SKU and size validation
    let products: Product[] = [];
    if (productsJson) {
      try {
        products = JSON.parse(productsJson);
      } catch (e) {
        console.warn('[Parse Inventory] Failed to parse products:', e);
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

    console.log(`[Parse Inventory] Analyzing ${file.name} (${(file.size / 1024).toFixed(1)} KB) with ${products.length} known products`);

    // Create instructions for Claude
    const validSKUs = products.map(p => p.sku).join(', ');
    const validSizes = Array.from(new Set(products.flatMap(p => p.sizes))).join(', ');

    const instructions = `You are analyzing an inventory spreadsheet containing starting stock levels.

Extract all inventory line items from this document and return them as a structured JSON array.

For each inventory line item, extract:
- sku: Product SKU (must match one of the valid SKUs below)
- size: Size variant (must match valid sizes below, or "One-Size" if not applicable)
- location: Warehouse location where inventory is stored
  Valid locations: "Warehouse", "Webstore", "Road", "Retail"
- quantity: Number of units available (must be a positive integer)

VALID SKUS:
${validSKUs || 'No SKUs provided - extract any SKUs found'}

VALID SIZES:
${validSizes || 'S, M, L, XL, 2XL, 3XL, One-Size'}

LOCATION MAPPING:
- "Warehouse" = Main warehouse, storage facility, central stock
- "Webstore" = Online store, web inventory, e-commerce
- "Road" = Touring stock, venue merch, show inventory, road case
- "Retail" = Physical retail store, shop floor

IMPORTANT GUIDELINES:
- SKU must match exactly (case-sensitive)
- If spreadsheet has a "Location" or "Warehouse" column, map it to one of the 4 valid locations
- If no size is specified, use "One-Size"
- Quantity must be >= 0 (ignore negative values)
- If a row has subtotals or summary data, skip it
- Only include line items with actual inventory quantities

Return ONLY a valid JSON object (no markdown formatting):
{
  "inventory": [
    {
      "sku": "GHOSRX203729BK",
      "size": "M",
      "location": "Warehouse",
      "quantity": 150
    },
    {
      "sku": "GHOSRX203729BK",
      "size": "L",
      "location": "Road",
      "quantity": 200
    }
  ]
}

If no inventory is found, return: {"inventory": []}`;

    const parsedResponse = await parseDocument(base64Data, mediaType, instructions);

    console.log(`[Parse Inventory] Successfully extracted ${parsedResponse.inventory?.length || 0} inventory items`);

    // Validate the response
    if (!parsedResponse.inventory || !Array.isArray(parsedResponse.inventory)) {
      console.error('[Parse Inventory] Invalid response format:', parsedResponse);
      return NextResponse.json(
        { error: 'Failed to extract inventory data from document' },
        { status: 500 }
      );
    }

    // Validate each inventory item
    const validLocations = ['Warehouse', 'Webstore', 'Road', 'Retail'];
    const validSKUSet = new Set(products.map(p => p.sku));

    const validInventory = parsedResponse.inventory.filter((item: any) => {
      if (!item.sku || !item.size || !item.location || typeof item.quantity !== 'number') {
        return false;
      }
      if (item.quantity < 0) {
        return false;
      }
      if (!validLocations.includes(item.location)) {
        console.warn(`[Parse Inventory] Invalid location "${item.location}" for ${item.sku}`);
        return false;
      }
      // If we have products, validate SKU matches
      if (products.length > 0 && !validSKUSet.has(item.sku)) {
        console.warn(`[Parse Inventory] Unknown SKU "${item.sku}" - not in product catalog`);
        return false;
      }
      return true;
    });

    if (validInventory.length < parsedResponse.inventory.length) {
      console.warn(`[Parse Inventory] Filtered out ${parsedResponse.inventory.length - validInventory.length} invalid items`);
    }

    // Calculate totals for summary
    const totalUnits = validInventory.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const uniqueSKUs = new Set(validInventory.map((item: any) => item.sku)).size;

    console.log(`[Parse Inventory] Returning ${validInventory.length} items (${totalUnits} total units across ${uniqueSKUs} SKUs)`);

    return NextResponse.json({
      inventory: validInventory,
      totalExtracted: parsedResponse.inventory.length,
      validItems: validInventory.length,
      totalUnits,
      uniqueSKUs
    });
  } catch (error: any) {
    console.error('[Parse Inventory] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse inventory' },
      { status: 500 }
    );
  }
}
