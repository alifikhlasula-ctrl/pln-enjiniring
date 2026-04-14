/**
 * Centralized Supabase Storage helper
 * - avatars/  → Foto profil intern (satu file per user, di-overwrite saat update)
 * - attendance/ → Foto clock-in/out (satu file per intern per tanggal per type)
 *
 * Bucket name: "hris-photos" (single public bucket, organized via folder paths)
 * You must create this bucket in Supabase Dashboard → Storage → New Bucket
 * Set: Public bucket = true (photos accessible via public URL)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
// Service role key bypasses RLS completely — safe for server-side only
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

/** The single bucket name for all HRIS photos */
export const BUCKET = 'hris-photos'

/**
 * Upload a file buffer to Supabase Storage under a structured path.
 * @param {string} path      - e.g. "avatars/user123.jpg"  or "attendance/intern456/2026-04-14-in.jpg"
 * @param {Buffer}  buffer   - File content as Node.js Buffer
 * @param {string}  mimeType - e.g. "image/jpeg"
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
export async function uploadPhoto(path, buffer, mimeType = 'image/jpeg') {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true  // overwrite if same path exists (profile updates use same path)
    })

  if (error) {
    throw new Error(`Storage upload error [${path}]: ${error.message}`)
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return urlData.publicUrl
}

/**
 * Upload a Base64 data URL string (e.g. "data:image/jpeg;base64,/9j/...") to Storage.
 * @param {string} path       - Structured storage path (see above)
 * @param {string} dataUrl    - Base64 data URL from canvas.toDataURL()
 * @returns {Promise<string>} - Public URL
 */
export async function uploadBase64Photo(path, dataUrl) {
  const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 data URL format')
  }
  const mimeType = matches[1]
  const buffer   = Buffer.from(matches[2], 'base64')
  return uploadPhoto(path, buffer, mimeType)
}

/**
 * Builds the standardized storage path for avatar photos.
 * @param {string} userId
 * @returns {string} - "avatars/{userId}.jpg"
 */
export function avatarPath(userId) {
  return `avatars/${userId}.jpg`
}

/**
 * Builds the standardized storage path for attendance face photos.
 * @param {string} internId
 * @param {string} date      - "YYYY-MM-DD"
 * @param {'in'|'out'} type
 * @returns {string} - "attendance/{internId}/{date}-{type}.jpg"
 */
export function attendancePath(internId, date, type) {
  return `attendance/${internId}/${date}-${type}.jpg`
}

// Legacy compatibility — keep the old function signature working
export async function uploadToStorage(bucket, path, file, contentType) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true })
  if (error) throw new Error(`Storage upload Failed: ${error.message}`)
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
  return urlData.publicUrl
}

export function base64ToBuffer(base64String) {
  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) throw new Error('Invalid input string')
  const type   = matches[1]
  const buffer = Buffer.from(matches[2], 'base64')
  return { type, buffer }
}
