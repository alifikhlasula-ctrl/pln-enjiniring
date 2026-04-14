require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupBucket() {
  const BUCKET = 'hris-photos';

  console.log(`Checking if bucket "${BUCKET}" exists...`);

  // Try to get bucket info
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Error listing buckets:', listError.message);
    process.exit(1);
  }

  const exists = buckets.some(b => b.name === BUCKET);

  if (exists) {
    console.log(`✅ Bucket "${BUCKET}" already exists.`);
  } else {
    console.log(`Creating bucket "${BUCKET}" as public...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB max per file
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (createError) {
      console.error(`❌ Failed to create bucket: ${createError.message}`);
      process.exit(1);
    }
    console.log(`✅ Bucket "${BUCKET}" created successfully.`);
  }

  console.log('');
  console.log('Bucket URL structure:');
  console.log(`  Avatars  → ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/avatars/{userId}.jpg`);
  console.log(`  Clock-In → ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/attendance/{internId}/{date}-in.jpg`);
  console.log(`  Clock-Out→ ${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/attendance/{internId}/{date}-out.jpg`);
}

setupBucket().catch(console.error);
