import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  password: text('password'), // nullable for Google-only OAuth users
  role: text('role').notNull().default('Anggota'), // 'ketua', 'wakil', 'bendahara', 'sekretaris', 'guest', 'Anggota', 'alumni', 'pending'
  name: text('name').notNull(),
  email: text('email'),
  avatarUrl: text('avatar_url'), // profile picture URL from Vercel Blob or Google profile
  googleId: text('google_id'), // Google's unique user ID (sub claim) for OAuth users
  authProvider: text('auth_provider').default('local'), // 'local' or 'google'
  status: text('status').default('active'), // 'active' or 'alumni'
  createdAt: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  description: text('description'), // nullable untuk kompatibilitas data existing
  amount: integer('amount'),
  type: text('type'), // 'income' or 'expense'
  category: text('category'), // e.g., 'Sewa Alat', 'Konsumsi', 'Kas Mingguan', 'Iuran Kas'
  status: text('status').default('Pending'),
  rejectionReason: text('rejection_reason'),
  attachmentUrl: text('attachment_url'), // nullable - path/name for receipt/documentation
  memberId: integer('member_id'), // optional foreign key to members table for payment transactions
  createdAt: timestamp('created_at').defaultNow(),
});

export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  nama: text('nama').notNull(),
  kelas: text('kelas'),
  status_kas: text('status_kas').default('Lunas'),
  keterangan: text('keterangan'),
});

export const attendance = pgTable('attendance', {
  id: serial('id').primaryKey(),
  member_id: integer('member_id'),
  bulan: text('bulan'),
  minggu_ke: integer('minggu_ke'),
  status: text('status'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cashRecords = pgTable('cash_records', {
  id: serial('id').primaryKey(),
  member_id: integer('member_id'),
  bulan: text('bulan'),
  minggu_ke: integer('minggu_ke'),
  status: text('status'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const approvals = pgTable('approvals', {
  id: serial('id').primaryKey(),
  deskripsi: text('deskripsi'),
  kategori: text('kategori'),
  tipe: text('tipe'),
  nominal: integer('nominal'),
  diajukan_oleh: text('diajukan_oleh'),
  status: text('status').default('Pending'),
  bukti_transfer: text('bukti_transfer'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  username: text('username').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: integer('target_id'),
  beforeValue: text('before_value'),
  afterValue: text('after_value'),
  description: text('description'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Config ────────────────────────────────────────────────────────────────
export const config = pgTable('config', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Categories ────────────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'Pemasukan' or 'Pengeluaran'
  createdAt: timestamp('created_at').defaultNow(),
});