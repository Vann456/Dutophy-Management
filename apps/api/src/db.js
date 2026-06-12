import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const connectionString = process.env.DATABASE_URL || 'postgres://dcms_user:dcms_password@localhost:5432/dcms_db';

// Create PostgreSQL connection pool with error handling
const pool = new Pool({ connectionString });

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('❌ Check DATABASE_URL in .env file');
  } else {
    console.log('✅ Database connected successfully');
    console.log('✅ Database timestamp:', res.rows[0].now);
  }
});

export const db = drizzle(pool);
