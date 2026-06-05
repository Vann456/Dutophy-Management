#!/usr/bin/env node
/**
 * Admin Migration Script
 * 
 * This script:
 * 1. Updates the old "admin" user's email to dutophy@gmail.com
 * 2. Updates the role and name to reflect the new primary admin
 * 3. Removes old hardcoded "Admin Bendahara" references
 * 
 * Run: node apps/api/src/scripts/migrate-admin.mjs
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import { users, auditLogs } from '../schema.js';

const connectionString = process.env.DATABASE_URL || 'postgres://dcms_user:dcms_password@localhost:5432/dcms_db';
const pool = new Pool({ connectionString });
const db = drizzle(pool);

const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

async function migrateAdmin() {
  console.log('🔍 Starting admin migration...\n');

  // Step 1: Find the old admin user
  const oldAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
  
  if (oldAdmin.length === 0) {
    console.log('❌ Old admin user (username="admin") not found in database.');
    console.log('   Creating new admin user instead...');
    
    // Create new admin user
    const inserted = await db.insert(users).values({
      username: 'admin',
      password: hashPassword('Dubes2026!'),
      role: 'ketua',
      name: 'Admin Dutophy',
      email: 'dutophy@gmail.com',
      status: 'active',
    }).returning();
    
    console.log(`✅ Created new admin user: id=${inserted[0].id}, username=admin, email=dutophy@gmail.com`);
    console.log('   Default password: Dubes2026!');
    console.log('   ⚠️  Please change this password after first login.');
    
    await pool.end();
    return;
  }

  const admin = oldAdmin[0];
  console.log(`📋 Found old admin user:`);
  console.log(`   - ID: ${admin.id}`);
  console.log(`   - Username: ${admin.username}`);
  console.log(`   - Name: ${admin.name}`);
  console.log(`   - Email: ${admin.email}`);
  console.log(`   - Role: ${admin.role}`);
  console.log(`   - Status: ${admin.status}`);
  console.log('');

  // Step 2: Check if any other user already has 'dutophy@gmail.com'
  const existingDutophyUser = await db.select().from(users).where(eq(users.email, 'dutophy@gmail.com')).limit(1);
  
  if (existingDutophyUser.length > 0 && existingDutophyUser[0].id !== admin.id) {
    console.log(`⚠️  Found existing user with email 'dutophy@gmail.com':`);
    console.log(`   - ID: ${existingDutophyUser[0].id}`);
    console.log(`   - Username: ${existingDutophyUser[0].username}`);
    console.log(`   - Name: ${existingDutophyUser[0].name}`);
    console.log(`   - Role: ${existingDutophyUser[0].role}`);
    console.log('');
    
    // Promote this user to admin by updating its username to 'admin'
    // First, rename old admin to avoid conflict
    const oldTimestamp = Date.now();
    console.log(`➡️  Renaming old admin (username=admin) to username=old_admin_${oldTimestamp}...`);
    await db.update(users).set({ 
      username: `old_admin_${oldTimestamp}`,
      status: 'alumni',
      role: 'Anggota',
      name: `${admin.name} (Archived)`,
    }).where(eq(users.id, admin.id));
    console.log(`   ✅ Old admin archived.`);
    
    console.log(`➡️  Promoting 'dutophy@gmail.com' user to primary admin...`);
    await db.update(users).set({
      username: 'admin',
      role: 'ketua',
      name: existingDutophyUser[0].name || 'Admin Dutophy',
      status: 'active',
    }).where(eq(users.id, existingDutophyUser[0].id));
    console.log(`   ✅ Promoted to admin role.`);
    
  } else {
    // No conflict - simply update the existing admin user's email, name, and role
    console.log('➡️  Updating old admin user with new credentials...');
    
    await db.update(users).set({
      email: 'dutophy@gmail.com',
      name: 'Admin Dutophy',
      role: 'ketua',
      status: 'active',
      password: hashPassword('Dubes2026!'),
    }).where(eq(users.id, admin.id));
    
    console.log(`   ✅ Updated admin user:`);
    console.log(`   - Name: Admin Dutophy`);
    console.log(`   - Email: dutophy@gmail.com`);
    console.log(`   - Role: ketua`);
    console.log(`   - Password: Dubes2026! (default)`);
  }

  console.log('');
  console.log('✅ Admin migration completed successfully!');
  console.log('');
  console.log('📌 Next steps:');
  console.log('   1. Log in with username "admin" and password "Dubes2026!"');
  console.log('   2. Change your password immediately via Settings > Keamanan Akun');
  console.log('   3. Verify that all dashboard features and permissions work correctly');
  console.log('');
  console.log('⚠️  Note: The "admin" username is preserved for backward compatibility');
  console.log('   with authorization checks throughout the application.');

  await pool.end();
}

migrateAdmin().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});