import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from './lib/generated/client/index.js';

const prisma = new PrismaClient();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function audit() {
  console.log('--- STORAGE AUDIT ---');
  
  // 1. Check if bucket exists
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error('❌ Error listing buckets:', bucketError.message);
  } else {
    const hrisBucket = buckets.find(b => b.name === 'hris-photos');
    if (hrisBucket) {
      console.log('✅ Bucket "hris-photos" EXISTS.');
      console.log('   Public:', hrisBucket.public);
    } else {
      console.error('❌ Bucket "hris-photos" NOT FOUND. This is why fallback is happening!');
    }
  }

  // 2. Check Database stats for Base64 vs URL
  const logs = await prisma.attendanceLog.findMany({
    select: { faceInUrl: true, faceInBase64: true, faceOutUrl: true, faceOutBase64: true }
  });

  let hasUrlIn = 0;
  let hasBase64In = 0;
  let hasUrlOut = 0;
  let hasBase64Out = 0;

  logs.forEach(l => {
    if (l.faceInUrl) hasUrlIn++;
    if (l.faceInBase64) hasBase64In++;
    if (l.faceOutUrl) hasUrlOut++;
    if (l.faceOutBase64) hasBase64Out++;
  });

  console.log('\n--- DATABASE STATS ---');
  console.log('Total Logs Checked:', logs.length);
  console.log('Clock-In photos using URL:', hasUrlIn);
  console.log('Clock-In photos using Base64:', hasBase64In);
  console.log('Clock-Out photos using URL:', hasUrlOut);
  console.log('Clock-Out photos using Base64:', hasBase64Out);
}

audit().finally(() => prisma.$disconnect());
