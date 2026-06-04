const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').trim() || 'http://localhost:3001';

function buildUrl(path) {
  return new URL(path, API_BASE).toString();
}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const finalHeaders = {
    ...defaultHeaders,
    ...(options.headers || {}),
  };

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(endpoint), {
    ...options,
    headers: finalHeaders,
  });

  if (response.status === 401) {
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errorText = `HTTP ${response.status}`;
    try {
      const json = await response.clone().json();
      if (json?.error) {
        errorText = json.error;
      } else {
        errorText = JSON.stringify(json);
      }
    } catch {
      const text = await response.clone().text();
      if (text) errorText = text;
    }
    throw new Error(errorText);
  }
  return response.json();
}

export async function login({ username, password }) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function register({ username, password, name, email }) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, name, email }),
  });
}

export async function fetchAuthMe() {
  return apiFetch('/api/auth/me');
}

export async function changePassword(currentPassword, newPassword) {
  return apiFetch('/api/auth/change-password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function fetchTransactions() {
  return apiFetch('/api/transactions');
}

export async function createTransaction(transaction) {
  return apiFetch('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({ ...transaction, status: 'Pending' }),
  });
}

export async function updateTransaction(id, data) {
  return apiFetch(`/api/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Members
export async function fetchMembers() {
  return apiFetch('/api/members');
}

export async function createMember({ nama, kelas, status_kas, keterangan }) {
  return apiFetch('/api/members', {
    method: 'POST',
    body: JSON.stringify({ nama, kelas, status_kas, keterangan }),
  });
}

export async function updateMember(id, data) {
  return apiFetch(`/api/members/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMember(id) {
  return apiFetch(`/api/members/${id}`, { method: 'DELETE' });
}

// Attendance
export async function fetchAttendance() {
  return apiFetch('/api/attendance');
}

export async function patchAttendance(id, data) {
  return apiFetch(`/api/attendance/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function createAttendance({ memberId, bulan, minggu_ke, status = '-' }) {
  return apiFetch('/api/attendance', {
    method: 'POST',
    body: JSON.stringify({ member_id: memberId, bulan, minggu_ke, status }),
  });
}

// Monthly Cash
export async function fetchCashRecords() {
  return apiFetch('/api/cash');
}

export async function createCashRecord({ memberId, bulan, minggu_ke, status = '-' }) {
  return apiFetch('/api/cash', {
    method: 'POST',
    body: JSON.stringify({ member_id: memberId, bulan, minggu_ke, status }),
  });
}

// Approvals
export async function fetchApprovals() {
  return apiFetch('/api/approvals');
}

export async function createApproval({ deskripsi, kategori, tipe, nominal, diajukan_oleh, bukti_transfer }) {
  return apiFetch('/api/approvals', {
    method: 'POST',
    body: JSON.stringify({ deskripsi, kategori, tipe, nominal, diajukan_oleh, bukti_transfer }),
  });
}

export async function patchApproval(id, data) {
  return apiFetch(`/api/approvals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Audit Logs
export async function fetchAuditLogs({ username = null, action = null, startDate = null, endDate = null, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (username) params.append('username', username);
  if (action) params.append('action', action);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  params.append('limit', limit);
  params.append('offset', offset);

  return apiFetch(`/api/audit-logs?${params.toString()}`);
}

// ─── Admin User Management ────────────────────────────────────────────────

export async function fetchAdminUsers() {
  return apiFetch('/api/admin/users');
}

export async function createAdminUser({ name, email, role }) {
  return apiFetch('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ name, email, role }),
  });
}

export async function updateUserRole(id, role) {
  return apiFetch(`/api/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function resetUserPassword(id, password) {
  return apiFetch(`/api/admin/users/${id}/reset-password`, {
    method: 'PATCH',
    body: JSON.stringify({ password }),
  });
}

export async function updateUserStatus(id, status) {
  return apiFetch(`/api/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ─── Settings / Config ─────────────────────────────────────────────────────

export async function fetchConfig() {
  return apiFetch('/api/config');
}

export async function updateConfig(data) {
  return apiFetch('/api/config', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── Categories ────────────────────────────────────────────────────────────

export async function fetchCategories(type) {
  const params = type ? `?type=${encodeURIComponent(type)}` : '';
  return apiFetch(`/api/categories${params}`);
}

export async function createCategory(data) {
  return apiFetch('/api/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id) {
  return apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
}
