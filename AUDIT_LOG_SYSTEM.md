# 🔐 Audit Log System - Dokumentasi Teknis

## Daftar Isi
1. [Arsitektur Sistem](#arsitektur-sistem)
2. [Struktur Data](#struktur-data)
3. [API Reference](#api-reference)
4. [Integrasi di Frontend](#integrasi-di-frontend)
5. [Best Practices](#best-practices)

---

## Arsitektur Sistem

### Alasan Desain
Audit Log System dirancang dengan prinsip:

1. **Separation of Concerns**: Helper function terpisah (`auditLog.js`) agar mudah dimaintain
2. **Non-blocking Logging**: Error dalam audit tidak akan merusak operasi utama (try-catch di helper)
3. **Scalability**: Menggunakan index pada database untuk query filter yang cepat
4. **Auditability**: Semua aktivitas penting tercatat dengan timestamp & user info
5. **Privacy**: IP Address & User Agent direkam untuk audit security

### Flow Diagram
```
User Action (Create/Edit/Delete Transaksi)
    ↓
API Endpoint (POST/PATCH/DELETE)
    ↓
Business Logic (db.insert/update/delete)
    ↓
createAuditLog() helper called
    ↓
Log inserted to auditLogs table
    ↓
Response sent to client
```

---

## Struktur Data

### Tabel: `audit_logs`

```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,                 -- ID user yg melakukan aksi
  username TEXT NOT NULL,          -- Username untuk quick search
  action TEXT NOT NULL,            -- Tipe aksi (CREATE_TRANSACTION, etc)
  target_type TEXT,                -- Tipe target (TRANSACTION, MEMBER, APPROVAL, etc)
  target_id INTEGER,               -- ID target yg diubah
  before_value TEXT,               -- JSON stringified value sebelum perubahan
  after_value TEXT,                -- JSON stringified value setelah perubahan
  description TEXT,                -- Deskripsi human-readable
  ip_address TEXT,                 -- IP address user (untuk security audit)
  user_agent TEXT,                 -- Browser info (opsional)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index untuk performance
CREATE INDEX idx_audit_logs_username ON audit_logs(username);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
```

### Supported Actions

| Action | Deskripsi | Target Type |
|--------|-----------|-------------|
| `LOGIN` | User berhasil login | USER |
| `LOGIN_FAILED` | Gagal login (invalid credentials) | USER |
| `CREATE_TRANSACTION` | Tambah transaksi | TRANSACTION |
| `CREATE_MEMBER` | Tambah anggota | MEMBER |
| `EDIT_MEMBER` | Edit data anggota | MEMBER |
| `DELETE_MEMBER` | Hapus anggota | MEMBER |
| `CREATE_APPROVAL` | Buat permohonan approval | APPROVAL |
| `APPROVE_EXPENSE` | Approve/reject pengeluaran | APPROVAL |
| `SETTINGS_CHANGE` | Ubah pengaturan kas | SETTINGS |

---

## API Reference

### Backend - `auditLog.js`

#### `createAuditLog(options)`

Helper function untuk membuat audit log entry.

**Signature:**
```javascript
async function createAuditLog({
  userId,              // Number - ID user (optional)
  username,           // String - Username (required)
  action,             // String - Jenis aksi (required)
  targetType,         // String - Tipe target (optional)
  targetId,           // Number - ID target (optional)
  beforeValue,        // Object - Nilai sebelum (optional)
  afterValue,         // Object - Nilai sesudah (optional)
  description,        // String - Deskripsi (optional)
  ipAddress,          // String - IP address (optional)
  userAgent           // String - User agent (optional)
})
```

**Contoh Penggunaan:**
```javascript
// 1. Log transaction creation
await createAuditLog({
  userId: user.id,
  username: user.username,
  action: 'CREATE_TRANSACTION',
  targetType: 'TRANSACTION',
  targetId: transaction.id,
  afterValue: transaction,
  description: `Created transaction: Iuran Minggu 1 (Rp 50000)`,
  ipAddress: extractClientInfo(c).ipAddress,
  userAgent: extractClientInfo(c).userAgent,
});

// 2. Log member update
await createAuditLog({
  userId: user.id,
  username: user.username,
  action: 'EDIT_MEMBER',
  targetType: 'MEMBER',
  targetId: member.id,
  beforeValue: { nama: 'Ahmad', status_kas: 'Lunas' },
  afterValue: { nama: 'Ahmad Rizky', status_kas: 'Tunggakan' },
  description: 'Updated member: Ahmad Rizky',
  ipAddress,
  userAgent,
});

// 3. Log failed login
await createAuditLog({
  username: 'unknown_user',
  action: 'LOGIN_FAILED',
  targetType: 'USER',
  description: 'Failed login attempt',
  ipAddress,
  userAgent,
});
```

#### `extractClientInfo(c)`

Helper untuk extract IP address dan User Agent dari Hono context.

**Signature:**
```javascript
function extractClientInfo(c) {
  return {
    ipAddress: String,  // IP address atau null
    userAgent: String   // Browser info atau null
  }
}
```

### REST API - `/api/audit-logs`

#### GET /api/audit-logs

Fetch audit logs dengan filter & pagination.

**Query Parameters:**
```
?username=admin              // Filter by username (partial match)
&action=LOGIN               // Filter by action type
&startDate=2024-05-01      // Filter dari tanggal (ISO format)
&endDate=2024-05-31        // Filter sampai tanggal (ISO format)
&limit=50                  // Max records per page (default: 50, max: 100)
&offset=0                  // Pagination offset (default: 0)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 2,
      "username": "bendahara",
      "action": "CREATE_TRANSACTION",
      "targetType": "TRANSACTION",
      "targetId": 123,
      "beforeValue": null,
      "afterValue": {
        "id": 123,
        "description": "Iuran Kas",
        "amount": 50000,
        "type": "Pemasukan"
      },
      "description": "Created transaction: Iuran Kas (Rp 50000)",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-05-25T10:30:00Z"
    }
  ],
  "total": 256,           // Total matching records
  "limit": 50,
  "offset": 0
}
```

**Error Response:**
```json
{
  "error": "Unauthorized"
}
```

**Note:** Hanya user dengan role `Bendahara` atau `Admin` yang bisa akses endpoint ini.

---

## Integrasi di Frontend

### API Client - `src/api.js`

```javascript
export async function fetchAuditLogs({
  username = null,
  action = null,
  startDate = null,
  endDate = null,
  limit = 50,
  offset = 0
} = {}) {
  const params = new URLSearchParams();
  if (username) params.append('username', username);
  if (action) params.append('action', action);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  params.append('limit', limit);
  params.append('offset', offset);

  return apiFetch(buildUrl(`/api/audit-logs?${params.toString()}`));
}
```

### UI Component - `src/pages/AuditLog/AuditLog.jsx`

Halaman interaktif untuk melihat & filter audit logs.

**Features:**
- Filter by username
- Filter by action type
- Filter by date range
- Pagination (previous/next)
- Color-coded action badges
- Formatted timestamps

**Contoh Penggunaan:**
```jsx
<AuditLog />
```

---

## Best Practices

### 1. **Logging di CRUD Operations**

Selalu log sebelum dan sesudah value untuk audit trail:

```javascript
// BEFORE: Get current value
const before = await db.select().from(members).where(eq(members.id, id));
const beforeValue = before[0];

// DO: Update
const updated = await db.update(members).set(values).where(eq(members.id, id)).returning();

// AFTER: Log with before & after values
await createAuditLog({
  userId: user.id,
  username: user.username,
  action: 'EDIT_MEMBER',
  targetType: 'MEMBER',
  targetId: id,
  beforeValue: beforeValue,
  afterValue: updated[0],
  // ...
});
```

### 2. **Error Handling**

Jangan throw error dari audit log - gunakan try-catch:

```javascript
try {
  await createAuditLog({ /* ... */ });
} catch (err) {
  console.error('Audit log failed:', err);
  // Don't throw - let main operation succeed
}
```

### 3. **Sensitive Data**

Jangan simpan sensitive data (passwords, tokens):

```javascript
// ✅ GOOD
afterValue: {
  username: 'ahmad',
  role: 'Bendahara'
}

// ❌ BAD
afterValue: {
  username: 'ahmad',
  password: 'hashed_password',  // Don't log passwords!
  token: 'secret_token'          // Don't log tokens!
}
```

### 4. **Index Strategy**

Database telah mempunyai index pada:
- `username` - untuk search user actions
- `action` - untuk filter by action type
- `created_at` - untuk sorting by date (most important!)
- `user_id` - untuk filter by user

Queries akan optimal untuk kombinasi filter yang umum.

### 5. **Retention Policy**

Untuk performa long-term, pertimbangkan:
- Archive logs older than 1 year ke separate table
- Delete logs older than 3 years
- Implement log rotation script

---

## Testing

### Manual Testing

1. **Login dengan user Bendahara**
   ```
   Username: admin
   Password: admin123
   ```

2. **Navigate ke Audit Log** (dari sidebar)

3. **Test Filter:**
   - Filter by username: `admin`
   - Filter by action: `LOGIN`
   - Filter by date range

4. **Test Actions:**
   - Buat transaksi → Cek audit log untuk `CREATE_TRANSACTION`
   - Edit member → Cek audit log untuk `EDIT_MEMBER`
   - Delete member → Cek audit log untuk `DELETE_MEMBER`

### Sample Query

```bash
curl -X GET "http://localhost:3001/api/audit-logs?username=admin&action=LOGIN&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Q: Audit log tidak muncul setelah aksi?
**A:** 
- Cek apakah user memiliki role `Bendahara` atau `Admin`
- Cek error logs di backend console
- Verify bahwa `auditLogs` table ada di database

### Q: Filter tidak bekerja?
**A:**
- Pastikan format date adalah ISO (YYYY-MM-DD)
- Check action name tepat sesuai konstanta (case-sensitive)
- Verify limit tidak melebihi 100

### Q: Query lambat dengan banyak logs?
**A:**
- Ensure indexes sudah dibuat
- Gunakan pagination dengan limit yang sesuai
- Archive old logs jika > 100K records

---

## Alasan Desain Teknis

### 1. Mengapa JSON stringify untuk before/after values?

**Alasan:**
- PostgreSQL tidak memiliki JSON column di schema ini, hanya TEXT
- JSON stringify memungkinkan menyimpan object kompleks
- Ketika read, bisa di-parse untuk perbandingan

**Alternative:** Jika use PostgreSQL JSONB column, bisa langsung simpan object

### 2. Mengapa separate table untuk audit logs?

**Alasan:**
- Audit logs adalah immutable (append-only)
- Tidak perlu diupdate, hanya insert & select
- Terpisah dari operasional data untuk better security
- Mudah untuk implement retention policy

### 3. Mengapa IP Address & User Agent?

**Alasan:**
- Membantu detect unauthorized access atau suspicious activity
- Compliance dengan audit requirements
- Dapat digunakan untuk implement IP-based restrictions di future

---

## Roadmap Future

- [ ] Export audit logs to CSV/PDF
- [ ] Real-time notifications untuk sensitive actions (login attempts, deletions)
- [ ] Advanced analytics dashboard (# actions per user per day, etc)
- [ ] Webhook integration untuk external audit systems
- [ ] Encrypted audit logs untuk sensitive organizations

---

**Last Updated:** May 25, 2024
**Version:** 1.0
**Author:** Dutophy Development Team
