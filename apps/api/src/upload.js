import dotenv from 'dotenv';
import { put } from '@vercel/blob';

// Load .env but do NOT override existing environment variables (e.g., from Render)
dotenv.config({ override: false });

export async function uploadToBlob(filename, buffer) {
  // Read token at runtime, not at import time
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  console.log('🔧 [upload.js] BLOB_READ_WRITE_TOKEN detected:', token ? 'YES (length: ' + token.length + ')' : 'NO');

  if (!token) {
    console.error('❌ BLOB_READ_WRITE_TOKEN is not set in environment variables');
    console.error('   Ensure it is set in Render Dashboard → Environment → BLOB_READ_WRITE_TOKEN');
    throw new Error(
      'Vercel Blob token is missing. Please set BLOB_READ_WRITE_TOKEN in environment variables.'
    );
  }

  try {
    const blob = await put(filename, buffer, {
      access: 'public',
      token,
    });
    console.log('✓ Image uploaded to Vercel Blob:', blob.url);
    return blob.url;
  } catch (err) {
    console.error('❌ Vercel Blob upload error:', err);
    throw new Error(`Failed to upload image: ${err.message}`);
  }
}