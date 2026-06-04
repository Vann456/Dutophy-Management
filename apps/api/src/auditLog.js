import { db } from './db.js';
import { auditLogs } from './schema.js';

/**
 * Membuat audit log otomatis untuk melacak aktivitas penting
 * @param {Object} options - Konfigurasi log
 * @param {number} options.userId - ID user yang melakukan aksi
 * @param {string} options.username - Username yang melakukan aksi
 * @param {string} options.action - Jenis aksi (CREATE_TRANSACTION, EDIT_TRANSACTION, DELETE_TRANSACTION, APPROVE_EXPENSE, LOGIN, SETTINGS_CHANGE, ROLE_CHANGE)
 * @param {string} options.targetType - Tipe target (TRANSACTION, APPROVAL, SETTINGS, USER, etc)
 * @param {number} options.targetId - ID target yang diubah
 * @param {Object} options.beforeValue - Nilai sebelum (optional)
 * @param {Object} options.afterValue - Nilai sesudah (optional)
 * @param {string} options.description - Deskripsi tambahan (optional)
 * @param {string} options.ipAddress - IP address user (optional)
 * @param {string} options.userAgent - User agent (optional)
 * @returns {Promise<void>}
 */
export async function createAuditLog(options = {}) {
  try {
    const {
      userId,
      username,
      action,
      targetType,
      targetId,
      beforeValue = null,
      afterValue = null,
      description = '',
      ipAddress = null,
      userAgent = null,
    } = options;

    // Validasi required fields
    if (!action || !username) {
      console.warn('Audit log skipped: missing action or username', options);
      return;
    }

    // Insert ke database
    await db.insert(auditLogs).values({
      userId: userId || null,
      username,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      beforeValue: beforeValue ? JSON.stringify(beforeValue) : null,
      afterValue: afterValue ? JSON.stringify(afterValue) : null,
      description: description || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    console.log(`[AUDIT] ${username} performed ${action} on ${targetType}#${targetId}`);
  } catch (err) {
    console.error('Error creating audit log:', err);
    // Don't throw - audit failure shouldn't break the main operation
  }
}

/**
 * Helper untuk extract IP dan User Agent dari Hono context
 * @param {Context} c - Hono context
 * @returns {Object} {ipAddress, userAgent}
 */
export function extractClientInfo(c) {
  const ipAddress =
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    c.req.header('x-real-ip') ||
    c.env?.incoming?.socket?.remoteAddress ||
    null;

  const userAgent = c.req.header('user-agent') || null;

  return { ipAddress, userAgent };
}
