import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;');
  console.log('✅ Column avatar_url added to users table');
  await pool.end();
} catch (e) {
  console.error('Error:', e.message);
  await pool.end();
}