#!/usr/bin/env node

/**
 * Production startup script for Render.
 * Runs database schema push (migration) then starts the API server.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('[start.mjs] Starting production boot sequence...');
console.log(`[start.mjs] DATABASE_URL set: ${!!process.env.DATABASE_URL}`);

// Step 1: Run drizzle-kit push to ensure all tables exist
try {
  console.log('[start.mjs] Running database schema push...');
  const configPath = path.join(__dirname, 'drizzle.config.ts');
  if (!fs.existsSync(configPath)) {
    console.error(`[start.mjs] Config file not found at ${configPath}`);
    process.exit(1);
  }

  // drizzle-kit push uses the config file relative to the cwd
  // We need to run it from apps/api so the relative paths in drizzle.config.ts resolve
  const result = execSync(
    `npx drizzle-kit push --config="${configPath}"`,
    {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env },
    }
  );
  console.log('[start.mjs] Schema push completed successfully.');
} catch (err) {
  console.error('[start.mjs] Schema push failed:', err.message);
  console.error('[start.mjs] Continuing anyway — the server may still work if tables already exist.');
}

// Step 2: Start the main API server
console.log('[start.mjs] Starting API server...');
await import('./src/index.js');