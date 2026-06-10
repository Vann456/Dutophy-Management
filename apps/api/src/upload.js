import { put } from '@vercel/blob';

export async function uploadToBlob(filename, buffer) {
  console.log('🔧 [upload.js] Upload called. Buffer size:', buffer.length);

  try {
    // Pass token directly to @vercel/blob — let the SDK handle validation
    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env['BLOB_READ_WRITE_TOKEN'],
    });
    console.log('✓ [upload.js] Image uploaded to Vercel Blob:', blob.url);
    return blob.url;
  } catch (err) {
    console.error('❌ [upload.js] Vercel Blob upload error:', err);
    console.error('   BLOB_READ_WRITE_TOKEN present:', !!process.env['BLOB_READ_WRITE_TOKEN']);
    throw new Error(`Failed to upload image: ${err.message}`);
  }
}