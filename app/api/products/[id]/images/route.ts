import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * GET /api/products/[id]/images
 * Fetch all images for a product
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    const supabase = createServiceClient();

    const { data: images, error } = await supabase
      .from('product_images_detail')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[GET product images] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ images: images || [] });
  } catch (error: any) {
    console.error('[GET product images] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products/[id]/images
 * Upload a new product image
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    const formData = await request.formData();

    const file = formData.get('file') as File;
    const imageType = formData.get('imageType') as string || 'grab_sheet';
    const tourId = formData.get('tourId') as string;
    const isPrimary = formData.get('isPrimary') === 'true';
    const caption = formData.get('caption') as string || null;

    if (!file || !tourId) {
      return NextResponse.json(
        { error: 'File and tourId are required' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type must be PNG, JPG, GIF, or WebP' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Upload file to Supabase Storage
    const fileName = `${tourId}/${productId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[POST product image] Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('product-images')
      .getPublicUrl(fileName);

    // If this is set as primary, unset other primary images
    if (isPrimary) {
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);
    }

    // Create database record
    const { data: imageRecord, error: dbError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        tour_id: tourId,
        image_type: imageType,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        is_primary: isPrimary,
        caption
      })
      .select()
      .single();

    if (dbError) {
      console.error('[POST product image] Database error:', dbError);
      // Try to delete uploaded file
      await supabase.storage.from('product-images').remove([fileName]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ image: imageRecord });
  } catch (error: any) {
    console.error('[POST product image] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
