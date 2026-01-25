#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mtfmckqbpykxblgpgnpo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupStorageBucket() {
  console.log('🗄️  Setting up Supabase Storage bucket for product images...\n');

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const existingBucket = buckets.find(b => b.name === 'product-images');

    if (existingBucket) {
      console.log('✓ Bucket "product-images" already exists');
      console.log(`  ID: ${existingBucket.id}`);
      console.log(`  Public: ${existingBucket.public}`);
      console.log(`  Created: ${existingBucket.created_at}`);

      // Check if it's public
      if (!existingBucket.public) {
        console.log('\n⚠️  Bucket exists but is not public. Updating to public...');
        const { error: updateError } = await supabase.storage.updateBucket('product-images', {
          public: true
        });

        if (updateError) {
          throw new Error(`Failed to update bucket to public: ${updateError.message}`);
        }

        console.log('✓ Bucket updated to public access');
      }
    } else {
      console.log('Creating new bucket "product-images"...');

      const { data: newBucket, error: createError } = await supabase.storage.createBucket('product-images', {
        public: true,
        fileSizeLimit: 10485760, // 10MB in bytes
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      });

      if (createError) {
        throw new Error(`Failed to create bucket: ${createError.message}`);
      }

      console.log('✓ Bucket "product-images" created successfully');
      console.log(`  ID: ${newBucket.name}`);
      console.log(`  Public: true`);
      console.log(`  Max file size: 10MB`);
      console.log(`  Allowed types: PNG, JPG, GIF, WebP`);
    }

    console.log('\n📸 Storage bucket is ready for image uploads');

    // Generate example public URL format
    const exampleUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/[tourId]/[productId]/[timestamp]-[filename]`;
    console.log(`\nPublic URL format: ${exampleUrl}`);

    console.log('\n✅ Storage bucket setup complete!');
    console.log('\nNext steps:');
    console.log('1. Upload product images via the UI at /tours/[id]/products');
    console.log('2. Images will be stored at: product-images/[tourId]/[productId]/[timestamp]-[filename]');
    console.log('3. Images will be publicly accessible via Supabase CDN');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupStorageBucket();
