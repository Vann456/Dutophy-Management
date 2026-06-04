import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/api/src/schema.ts',
  out: './apps/api/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://dcms_user:dcms_password@localhost:5432/dcms_db',
  },
});
