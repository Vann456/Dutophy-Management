import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  role: text('role').notNull().default('Anggota'),
  name: text('name').notNull(),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  description: text('description'),
  amount: integer('amount'),
  type: text('type'),
  category: text('category'),
  status: text('status').default('Pending'),
  rejectionReason: text('rejection_reason'),
  attachmentUrl: text('attachment_url'),
  memberId: integer('member_id'),
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

export const config = pgTable('config', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});