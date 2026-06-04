import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const connectionString = process.env.DATABASE_URL || 'postgres://dcms_user:dcms_password@localhost:5432/dcms_db';
const pool = new Pool({ connectionString });
export const db = drizzle(pool);
