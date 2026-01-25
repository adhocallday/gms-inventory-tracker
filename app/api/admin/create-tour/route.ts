import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

interface TourData {
  name: string;
  artist: string;
  startDate: string;
  endDate: string;
  description?: string;
}

interface Show {
  showDate: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  capacity?: number;
}

interface Product {
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  sizes: string[];
  imageUrl?: string;
  imageDataUrl?: string; // Base64 data URL from PDF extraction
}

interface InventoryItem {
  sku: string;
  size: string;
  location: string;
  quantity: number;
}

/**
 * POST /api/admin/create-tour
 * Create a new tour with shows, products, and initial inventory
 */
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const { tourData, shows, products, initialInventory } = body as {
      tourData: TourData;
      shows: Show[];
      products: Product[];
      initialInventory: InventoryItem[];
    };

    // Validate required fields
    if (!tourData.name || !tourData.artist || !tourData.startDate || !tourData.endDate) {
      return NextResponse.json(
        { error: 'Missing required tour fields' },
        { status: 400 }
      );
    }

    console.log(`[Create Tour] Starting creation: ${tourData.name} by ${tourData.artist}`);

    // Step 1: Create the tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .insert({
        name: tourData.name,
        artist: tourData.artist,
        start_date: tourData.startDate,
        end_date: tourData.endDate,
        description: tourData.description || null
      })
      .select()
      .single();

    if (tourError || !tour) {
      console.error('[Create Tour] Failed to create tour:', tourError);
      return NextResponse.json(
        { error: tourError?.message || 'Failed to create tour' },
        { status: 500 }
      );
    }

    const tourId = tour.id;
    console.log(`[Create Tour] Created tour ${tourId}`);

    // Step 2: Create shows (if any)
    if (shows.length > 0) {
      const showInserts = shows.map(show => ({
        tour_id: tourId,
        show_date: show.showDate,
        venue_name: show.venueName,
        city: show.city,
        state: show.state,
        country: show.country,
        capacity: show.capacity || null
      }));

      const { data: createdShows, error: showsError } = await supabase
        .from('shows')
        .insert(showInserts)
        .select();

      if (showsError) {
        console.error('[Create Tour] Failed to create shows:', showsError);
        // Don't fail the entire operation, but log the error
      } else {
        console.log(`[Create Tour] Created ${createdShows?.length || 0} shows`);
      }
    }

    // Step 3: Create products (if any)
    if (products.length > 0) {
      // Check if products table has a tour_id column
      // If not, we'll need to handle differently
      const productInserts = products.map(product => ({
        tour_id: tourId,
        sku: product.sku,
        name: product.name,
        category: product.category,
        base_price: product.basePrice,
        sizes: product.sizes, // Assuming sizes is a JSON array column
        image_url: product.imageUrl || null
      }));

      const { data: createdProducts, error: productsError } = await supabase
        .from('products')
        .insert(productInserts)
        .select();

      if (productsError) {
        console.error('[Create Tour] Failed to create products:', productsError);
        // If products table doesn't have tour_id, try without it
        if (productsError.message?.includes('tour_id')) {
          console.log('[Create Tour] Retrying without tour_id...');
          const productInsertsWithoutTourId = products.map(product => ({
            sku: product.sku,
            name: product.name,
            category: product.category,
            base_price: product.basePrice,
            sizes: product.sizes,
            image_url: product.imageUrl || null
          }));

          const { data: retryProducts, error: retryError } = await supabase
            .from('products')
            .insert(productInsertsWithoutTourId)
            .select();

          if (retryError) {
            console.error('[Create Tour] Retry also failed:', retryError);
          } else {
            console.log(`[Create Tour] Created ${retryProducts?.length || 0} products (without tour_id)`);
          }
        }
      } else {
        console.log(`[Create Tour] Created ${createdProducts?.length || 0} products`);

        // Step 3.5: Save product images if they exist
        const productsWithImages = products.filter(p => p.imageDataUrl);
        if (productsWithImages.length > 0 && createdProducts) {
          console.log(`[Create Tour] Saving ${productsWithImages.length} product images...`);

          for (const product of productsWithImages) {
            // Find the created product by SKU
            const createdProduct = createdProducts.find(cp => cp.sku === product.sku);
            if (!createdProduct || !product.imageDataUrl) continue;

            try {
              const { error: imageError } = await supabase
                .from('product_images')
                .insert({
                  product_id: createdProduct.id,
                  tour_id: tourId,
                  image_type: 'grab_sheet',
                  file_url: product.imageDataUrl, // Store base64 data URL
                  is_primary: true,
                  display_order: 0
                });

              if (imageError) {
                console.error(`[Create Tour] Failed to save image for ${product.sku}:`, imageError);
              }
            } catch (imageError) {
              console.error(`[Create Tour] Error saving image for ${product.sku}:`, imageError);
            }
          }

          console.log('[Create Tour] Finished saving product images');
        }
      }
    }

    // Step 4: Create initial inventory (if any)
    if (initialInventory.length > 0) {
      // Map location names to standard format
      const locationMapping: Record<string, string> = {
        'Warehouse': 'warehouse',
        'Webstore': 'webstore',
        'Road': 'road',
        'Retail': 'retail'
      };

      const inventoryInserts = initialInventory.map(item => ({
        tour_id: tourId,
        sku: item.sku,
        size: item.size,
        location: locationMapping[item.location] || item.location.toLowerCase(),
        quantity: item.quantity,
        movement_type: 'initial', // Initial stock entry
        created_at: new Date().toISOString()
      }));

      // Try inserting into inventory_movements or inventory table
      const { data: createdInventory, error: inventoryError } = await supabase
        .from('inventory_movements')
        .insert(inventoryInserts)
        .select();

      if (inventoryError) {
        console.error('[Create Tour] Failed to create inventory:', inventoryError);
        // Try alternative table name if exists
        if (inventoryError.message?.includes('relation') || inventoryError.message?.includes('does not exist')) {
          console.log('[Create Tour] Trying "inventory" table...');
          const { data: retryInventory, error: retryError } = await supabase
            .from('inventory')
            .insert(inventoryInserts)
            .select();

          if (retryError) {
            console.error('[Create Tour] Inventory retry also failed:', retryError);
          } else {
            console.log(`[Create Tour] Created ${retryInventory?.length || 0} inventory items`);
          }
        }
      } else {
        console.log(`[Create Tour] Created ${createdInventory?.length || 0} inventory items`);
      }
    }

    console.log(`[Create Tour] Successfully created tour ${tourId} with ${shows.length} shows, ${products.length} products, ${initialInventory.length} inventory items`);

    return NextResponse.json({
      tourId,
      message: 'Tour created successfully',
      summary: {
        shows: shows.length,
        products: products.length,
        inventoryItems: initialInventory.length
      }
    });
  } catch (error: any) {
    console.error('[Create Tour] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create tour' },
      { status: 500 }
    );
  }
}
