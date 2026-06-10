import { put } from '@vercel/blob';

/**
 * Upload a file buffer to Vercel Blob storage.
 * This runs 100% server-side inside the Render Express backend.
 *
 * @param {string} filename - e.g. "avatars/1234567890-abcd.jpg"
 * @param {Buffer} buffer - raw file bytes
 * @returns {Promise<string>} public URL of the uploaded blob
 */
export async function uploadToVercelBlob(filename, buffer) {
  const token = process.env['BLOB_READ_WRITE_TOKEN'];

  console.log('[upload.js] Uploading to Vercel Blob...');
  console.log('   filename:', filename);
  console.log('   size:', buffer.length, 'bytes');
  console.log('   token present:', !!token);

  if (!token) {
    throw new Error(
      'Server configuration error: BLOB_READ_WRITE_TOKEN is not set. ' +
      'Add it to Render Dashboard → Environment → BLOB_READ_WRITE_TOKEN and redeploy.'
    );
  }

  const blob = await put(filename, buffer, {
    access: 'public',
    token,
  });

  console.log('✓ Upload complete:', blob.url);
  return blob.url;
}