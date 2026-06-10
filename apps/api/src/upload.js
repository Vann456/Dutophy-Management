import { put } from '@vercel/blob';

export async function uploadToBlob(filename, buffer) {
  // Read token using bracket notation to prevent any compile-time evaluation
  const token = process.env['BLOB_READ_WRITE_TOKEN'];

  console.log('🔧 [upload.js] process.env.BLOB_READ_WRITE_TOKEN:', token ? `PRESENT (length: ${token.length})` : 'MISSING');

  if (!token || token.length === 0) {
    console.error('❌ [upload.js] BLOB_READ_WRITE_TOKEN is missing or empty');
    console.error('   Render env var check:');
    console.error('     Keys available:', Object.keys(process.env).filter(k => k.includes('BLOB') || k.includes('TOKEN')).join(', ') || '(none matching)');
    throw new Error(
      'Vercel Blob token is missing. Please set BLOB_READ_WRITE_TOKEN in Render environment variables.'
    );
  }

  try {
    const blob = await put(filename, buffer, {
      access: 'public',
      token,
    });
    console.log('✓ [upload.js] Image uploaded to Vercel Blob:', blob.url);
    return blob.url;
  } catch (err) {
    console.error('❌ [upload.js] Vercel Blob upload error:', err);
    throw new Error(`Failed to upload image: ${err.message}`);
  }
}