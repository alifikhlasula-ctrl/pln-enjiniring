import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use the service role key to bypass RLS for server-side operations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Uploads a file buffer/blob to Supabase Storage
 * @param {string} bucket - The name of the bucket (e.g. 'hris_documents')
 * @param {string} path - The path inside the bucket (e.g. 'onboarding/ob123_ktp.jpg')
 * @param {Buffer|Blob|File} file - The file content
 * @param {string} contentType - The mime type of the file
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export async function uploadToStorage(bucket, path, file, contentType) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: true
    });

  if (error) {
    throw new Error(`Storage upload Failed: ${error.message}`);
  }

  // Get the public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

/**
 * Converts a base64 string to a Buffer for uploading
 * @param {string} base64String - format "data:image/jpeg;base64,/9j/4AAQ..."
 */
export function base64ToBuffer(base64String) {
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid input string');
  }
  const type = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  return { type, buffer };
}
