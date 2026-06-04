import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname tidak tersedia di ESM — derive dari import.meta.url
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// .env dicari dari root monorepo (2 level di atas packages/db/)
// Pakai __dirname bukan cwd — tidak terpengaruh dari mana script dijalankan
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL tidak ditemukan.\n' +
    'Pastikan file .env ada di root monorepo dan berisi:\n' +
    'DATABASE_URL="postgresql://dcms_user:dcms_password@localhost:5432/dcms_db"'
  );
}

export default defineConfig({
  // Entry point schema — satu file berisi semua tabel + relations
  schema: './src/db/schema.ts',

  // Folder output file migrasi SQL
  out: './src/migrations',

  dialect: 'postgresql',

  dbCredentials: {
    url: process.env.DATABASE_URL,
  },

  // Nama tabel tracking migrasi — eksplisit agar tidak bentrok
  migrations: {
    table: '__dcms_migrations',
    schema: 'public',
  },

  verbose: true,
  strict: true,
});
