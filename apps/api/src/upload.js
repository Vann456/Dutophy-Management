import 'dotenv/config';
import { put } from '@vercel/blob';

export async function uploadToBlob(filename, buffer) {
  try {
    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  } catch (err) {
    console.error('Vercel Blob upload error:', err);
    throw new Error('Failed to upload to blob storage');
  }
}