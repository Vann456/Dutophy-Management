import { defineConfig } from 'drizzle-kit';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  schema: path.join(__dirname, 'src/schema.ts'),
  out: path.join(__dirname, 'drizzle'),
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://dcms_user:dcms_password@localhost:5432/dcms_db',
  },
});
