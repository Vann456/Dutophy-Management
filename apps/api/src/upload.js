import 'dotenv/config';
import { put } from '@vercel/blob';

export async function uploadToBlob(filename, buffer) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    console.error('❌ BLOB_READ_WRITE_TOKEN is not set in environment variables');
    console.error('   Set it in your Render dashboard: Dashboard → Environment → BLOB_READ_WRITE_TOKEN');
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