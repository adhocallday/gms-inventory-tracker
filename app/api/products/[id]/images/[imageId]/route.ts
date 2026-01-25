import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * PATCH /api/products/[id]/images/[imageId]
 * Update a product image (e.g., set as primary, update caption)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const { id: productId, imageId } = params;
    const body = await request.json();
    const { isPrimary, caption, displayOrder } = body;

    const supabase = createServiceClient();

    // If setting as primary, unset other primary images for this product
    if (isPrimary === true) {
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);
    }

    // Update the image
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (isPrimary !== undefined) updateData.is_primary = isPrimary;
    if (caption !== undefined) updateData.caption = caption;
    if (displayOrder !== undefined) updateData.display_order = displayOrder;

    const { data: image, error } = await supabase
      .from('product_images')
      .update(updateData)
      .eq('id', imageId)
      .eq('product_id', productId)
      .select()
      .single();

    if (error) {
      console.error('[PATCH image] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ image });
  } catch (error: any) {
    console.error('[PATCH image] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update image' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]/images/[imageId]
 * Delete a product image
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const { id: productId, imageId } = params;
    const supabase = createServiceClient();

    // Fetch image to get file URL
    const { data: image, error: fetchError } = await supabase
      .from('product_images')
      .select('file_url, tour_id')
      .eq('id', imageId)
      .eq('product_id', productId)
      .single();

    if (fetchError) {
      console.error('[DELETE image] Fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete from Supabase Storage
    try {
      // Extract file path from URL
      const url = new URL(image.file_url);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/product-images\/(.+)$/);

      if (pathMatch && pathMatch[1]) {
        const filePath = pathMatch[1];
        await supabase.storage
          .from('product-images')
          .remove([filePath]);
      }
    } catch (storageError) {
      console.warn('[DELETE image] Failed to delete from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)
      .eq('product_id', productId);

    if (deleteError) {
      console.error('[DELETE image] Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Image deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE image] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete image' },
      { status: 500 }
    );
  }
}
