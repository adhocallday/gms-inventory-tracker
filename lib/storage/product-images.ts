import { createServiceClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'product-images';

/**
 * Upload a product image to Supabase Storage and save reference to database.
 *
 * @param imageDataUrl - Base64 data URL (e.g., "data:image/png;base64,...")
 * @param productId - Product UUID (if known)
 * @param tourId - Tour UUID
 * @param sku - Product SKU (used for filename)
 * @param imageType - Type of image: 'grab_sheet', 'mockup', 'lifestyle', 'detail'
 * @returns The public URL of the uploaded image
 */
export async function uploadProductImage(
  imageDataUrl: string,
  productId: string | null,
  tourId: string,
  sku: string,
  imageType: 'grab_sheet' | 'mockup' | 'lifestyle' | 'detail' = 'grab_sheet'
): Promise<string | null> {
  const supabase = createServiceClient();

  try {
    // Extract base64 data from data URL
    const matches = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      console.error('[ProductImages] Invalid data URL format');
      return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Determine file extension
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';

    // Create unique filename
    const timestamp = Date.now();
    const safeSku = sku.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${tourId}/${safeSku}_${timestamp}.${ext}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      // If bucket doesn't exist, log helpful message
      if (uploadError.message.includes('Bucket not found')) {
        console.error(`[ProductImages] Storage bucket "${BUCKET_NAME}" not found. Create it in Supabase Dashboard.`);
      } else {
        console.error('[ProductImages] Upload error:', uploadError);
      }
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);

    const publicUrl = urlData.publicUrl;

    // Save reference to product_images table
    const { error: dbError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        tour_id: tourId,
        image_type: imageType,
        file_url: publicUrl,
        file_size: buffer.length,
        mime_type: mimeType,
        is_primary: true,
        caption: `${sku} - Auto-extracted from grab sheet`
      });

    if (dbError) {
      console.error('[ProductImages] Database insert error:', dbError);
      // Image was uploaded but DB failed - still return URL
    }

    console.log(`[ProductImages] Uploaded ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return publicUrl;
  } catch (error) {
    console.error('[ProductImages] Error uploading image:', error);
    return null;
  }
}

/**
 * Upload multiple product images in parallel.
 *
 * @param images - Array of {dataUrl, sku, productId} objects
 * @param tourId - Tour UUID
 * @returns Array of uploaded image URLs (null for failed uploads)
 */
export async function uploadProductImages(
  images: Array<{ dataUrl: string; sku: string; productId?: string }>,
  tourId: string
): Promise<(string | null)[]> {
  const results = await Promise.all(
    images.map(img =>
      uploadProductImage(
        img.dataUrl,
        img.productId || null,
        tourId,
        img.sku,
        'grab_sheet'
      )
    )
  );

  const successful = results.filter(r => r !== null).length;
  console.log(`[ProductImages] Uploaded ${successful}/${images.length} images`);

  return results;
}

/**
 * Get product images for a tour.
 */
export async function getProductImages(tourId: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('product_images')
    .select('*')
    .eq('tour_id', tourId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ProductImages] Error fetching images:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete a product image from storage and database.
 */
export async function deleteProductImage(imageId: string): Promise<boolean> {
  const supabase = createServiceClient();

  // Get image info first
  const { data: image, error: fetchError } = await supabase
    .from('product_images')
    .select('file_url')
    .eq('id', imageId)
    .single();

  if (fetchError || !image) {
    console.error('[ProductImages] Image not found:', imageId);
    return false;
  }

  // Extract path from URL
  const url = new URL(image.file_url);
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
  const storagePath = pathMatch ? pathMatch[1] : null;

  // Delete from storage
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (storageError) {
      console.error('[ProductImages] Storage delete error:', storageError);
    }
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId);

  if (dbError) {
    console.error('[ProductImages] Database delete error:', dbError);
    return false;
  }

  return true;
}
