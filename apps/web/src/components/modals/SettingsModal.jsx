import { useEffect, useRef, useState } from 'react';
import { fetchAuditLogs, fetchConfig, updateConfig, fetchCategories, createCategory, deleteCategory, fetchAdminUsers, createAdminUser, updateUserRole, resetUserPassword, updateUserStatus, changePassword } from '../../api';

const actionConfig = {
  LOGIN: { color: 'text-green-400 bg-green-900/30 border-green-500/50', icon: 'login' },
  LOGIN_FAILED: { color: 'text-error bg-error-container/30 border-error-container', icon: 'block' },
  CREATE_TRANSACTION: { color: 'text-blue-400 bg-blue-900/30 border-blue-500/50', icon: 'add_circle' },
  EDIT_MEMBER: { color: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50', icon: 'edit' },
  DELETE_MEMBER: { color: 'text-error bg-error-container/30 border-error-container', icon: 'delete' },
  CREATE_MEMBER: { color: 'text-green-400 bg-green-900/30 border-green-500/50', icon: 'person_add' },
  APPROVE_EXPENSE: { color: 'text-purple-400 bg-purple-900/30 border-purple-500/50', icon: 'check_circle' },
  CREATE_APPROVAL: { color: 'text-cyan-400 bg-cyan-900/30 border-cyan-500/50', icon: 'receipt' },
  SETTINGS_CHANGE: { color: 'text-orange-400 bg-orange-900/30 border-orange-500/50', icon: 'tune' },
};

const tabs = [
  { id: 'kas', label: 'Konfigurasi Kas' },
  { id: 'keamanan', label: 'Keamanan Akun' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'pengurus', label: 'Manajemen Pengurus' },
];

const ROLE_OPTIONS = ['ketua', 'wakil', 'bendahara', 'sekretaris'];

const getRoleBadgeStyle = (role) => {
  const styles = {
    'ketua': 'bg-purple-900/40 text-purple-300 border-purple-500/50',
    'wakil': 'bg-blue-900/40 text-blue-300 border-blue-500/50',
    'bendahara': 'bg-emerald-900/40 text-emerald-300 border-emerald-500/50',
    'sekretaris': 'bg-amber-900/40 text-amber-300 border-amber-500/50',
    'guest': 'bg-gray-800/40 text-gray-300 border-gray-500/50',
    'Anggota': 'bg-cyan-900/40 text-cyan-300 border-cyan-500/50',
  };
  return styles[role] || 'bg-surface-container text-on-surface border-outline-variant';
};

const SettingsModal = ({ isOpen, onClose, initialTab = 'kas', user }) => {
  // Debug: log full user object to inspect structure
  console.log('SettingsModal - user:', user, 'isOpen:', isOpen);
  
  // Try multiple possible locations for username/role
  const currentUsername = user?.username || user?.user?.username || '';
  // Role check: case-insensitive exact match
  const currentUserRole = String(user?.role || user?.user?.role || '').toLowerCase().trim();
  
  // Super Tier: master admin (username='dutophy@gmail.com') OR authorized roles (ketua/wakil)
  const isSuperTier = currentUsername === 'dutophy@gmail.com' || currentUserRole === 'ketua' || currentUserRole === 'wakil';
  
  console.log('SettingsModal - currentUsername:', currentUsername, 'currentUserRole:', currentUserRole, 'isSuperTier:', isSuperTier);
  
  // Can access Audit Log and Manajemen Pengurus tabs only for Super Tier
  const canAccessAuditLog = isSuperTier === true;
  
  // Check if user data is still loading (user is null/undefined but modal is open)
  const userLoading = !user && !currentUsername && isOpen;
  const [weeklyFee, setWeeklyFee] = useState(10000);
  const isKasConfigValid = Number(weeklyFee) > 0;
  const [configMsg, setConfigMsg] = useState('');

  // Category state
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [newIncomeCategory, setNewIncomeCategory] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const [categoryMsg, setCategoryMsg] = useState('');

  // Admin users state
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'Anggota' });
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  const [passwords, setPasswords] = useState({ current: '', newPwd: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);

  const [filterUsername, setFilterUsername] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const logsScrollRef = useRef(null);

  // Load config from backend
  useEffect(() => {
    if (!isOpen) return;
    loadConfig();
    loadCategories();
    if (canAccessAuditLog) {
      loadAdminUsers();
    }
  }, [isOpen, canAccessAuditLog]);

  const loadConfig = async () => {
    try {
      const res = await fetchConfig();
      if (res?.success && res.data) {
        if (res.data.weeklyFee) setWeeklyFee(Number(res.data.weeklyFee));
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      setConfigMsg('Gagal memuat konfigurasi.');
    }
  };

  const loadCategories = async () => {
    try {
      const [income, expense] = await Promise.all([
        fetchCategories('Pemasukan'),
        fetchCategories('Pengeluaran'),
      ]);
      setIncomeCategories(income || []);
      setExpenseCategories(expense || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setCategoryMsg('Gagal memuat kategori.');
    }
  };

  const loadAdminUsers = async () => {
    setAdminUsersLoading(true);
    try {
      const res = await fetchAdminUsers();
      if (res?.success) {
        setAdminUsers(res.data || []);
      } else {
        setAdminMsg('Gagal memuat data pengurus.');
      }
    } catch (err) {
      console.error('Failed to load admin users:', err);
      setAdminMsg('Gagal memuat data pengurus - pastikan Anda memiliki akses.');
    } finally {
      setAdminUsersLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    // Only load audit logs if user is authorized (ketua or wakil)
    if (activeTab === 'audit') {
      if (!isOpen || !canAccessAuditLog) {
        // Reset loading state when switching to audit tab but not authorized
        setLoading(false);
        return;
      }
      loadAuditLogs();
    }
  }, [isOpen, activeTab, offset, limit, filterUsername, filterAction, filterStartDate, filterEndDate, canAccessAuditLog]);

  if (!isOpen) return null;

  const saveSettings = async () => {
    try {
      setConfigMsg('');
      const feeValue = Number(weeklyFee);
      if (!Number.isFinite(feeValue) || feeValue < 0) {
        setConfigMsg('Nominal kas mingguan tidak valid.');
        return;
      }
      const data = { weeklyFee: String(feeValue) };
      await updateConfig(data);
      setConfigMsg('Pengaturan kas berhasil disimpan.');
      window.dispatchEvent(new Event('settings:updated'));
      setTimeout(() => setConfigMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setConfigMsg('Gagal menyimpan pengaturan.');
    }
  };

  const handleAddIncomeCategory = async () => {
    if (!newIncomeCategory.trim()) return;
    try {
      setCategoryMsg('');
      await createCategory({ name: newIncomeCategory.trim(), type: 'Pemasukan' });
      setNewIncomeCategory('');
      await loadCategories();
      window.dispatchEvent(new Event('categories:updated'));
    } catch (err) {
      setCategoryMsg(err?.message || 'Gagal menambah kategori pemasukan.');
    }
  };

  const handleAddExpenseCategory = async () => {
    if (!newExpenseCategory.trim()) return;
    try {
      setCategoryMsg('');
      await createCategory({ name: newExpenseCategory.trim(), type: 'Pengeluaran' });
      setNewExpenseCategory('');
      await loadCategories();
      window.dispatchEvent(new Event('categories:updated'));
    } catch (err) {
      setCategoryMsg(err?.message || 'Gagal menambah kategori pengeluaran.');
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await deleteCategory(id);
      await loadCategories();
      window.dispatchEvent(new Event('categories:updated'));
      setCategoryMsg('');
    } catch (err) {
      // Extract error message from response if available
      const errorMsg = err?.response?.data?.error || err?.message || 'Gagal menghapus kategori.';
      setCategoryMsg(errorMsg);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email || !newUserForm.role) {
      setAdminMsg('Isi semua field.');
      return;
    }
    try {
      const res = await createAdminUser(newUserForm);
      if (res?.success) {
        setAdminMsg(`Pengurus berhasil ditambahkan. Password sementara: ${res.data.temporaryPassword}`);
        setTempPassword(res.data.temporaryPassword);
        setNewUserForm({ name: '', email: '', role: 'Anggota' });
        setShowNewUserForm(false);
        loadAdminUsers();
      }
    } catch (err) {
      setAdminMsg(`Gagal: ${err.message}`);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setAdminMsg('Role berhasil diubah.');
      loadAdminUsers();
      setTimeout(() => setAdminMsg(''), 3000);
    } catch (err) {
      setAdminMsg(`Gagal: ${err.message}`);
    }
  };

  const handleResetPassword = async (userId, userName) => {
    const newPassword = window.prompt(`Masukkan password baru untuk ${userName}:`);
    if (!newPassword) return;
    try {
      const res = await resetUserPassword(userId, newPassword);
      if (res?.success) {
        alert(`Password untuk ${userName} berhasil di-reset menjadi: ${res.temporaryPassword}`);
        loadAdminUsers();
      }
    } catch (err) {
      alert(`Gagal reset password: ${err.message}`);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'alumni' : 'active';
    try {
      await updateUserStatus(userId, newStatus);
      setAdminMsg(newStatus === 'alumni' ? 'Pengurus dinonaktifkan (alumni).' : 'Pengurus diaktifkan kembali.');
      loadAdminUsers();
      setTimeout(() => setAdminMsg(''), 3000);
    } catch (err) {
      setAdminMsg(`Gagal: ${err.message}`);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.newPwd) return setMsg('Mohon isi semua kolom password');
    if (passwords.newPwd !== passwords.confirm) return setMsg('Password baru tidak cocok');
    try {
      await changePassword(passwords.current, passwords.newPwd);
      alert('Password berhasil diperbarui!');
      setPasswords({ current: '', newPwd: '', confirm: '' });
    } catch (err) {
      alert(err.message || 'Gagal mengubah password');
    }
  };

  async function loadAuditLogs() {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({
        username: filterUsername || null,
        action: filterAction || null,
        startDate: filterStartDate || null,
        endDate: filterEndDate || null,
        limit,
        offset,
      });
      setLogs(res.data || []);
      setTotal(res.total || 0);
      setMsg(''); // Clear any previous error messages
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      // Extract error message from response if available
      const errorMsg = err?.response?.data?.error || err?.message || 'Gagal memuat log aktivitas. Pastikan Anda memiliki akses.';
      setMsg(errorMsg);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const handleResetFilters = () => {
    setFilterUsername('');
    setFilterAction('');
    setFilterStartDate('');
    setFilterEndDate('');
    setOffset(0);
  };

  const handlePrevious = () => {
    const newOffset = Math.max(0, offset - limit);
    setOffset(newOffset);
  };

  const handleNext = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const scrollLogsToTop = () => {
    logsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollLogsToBottom = () => {
    const el = logsScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const canAccessRestrictedTabs = isSuperTier === true;
  const visibleTabs = tabs.filter((tab) => {
    if (tab.id !== 'audit' && tab.id !== 'pengurus') return true;
    return canAccessRestrictedTabs;
  });

  const getActionBadge = (action) => {
    const config = actionConfig[action] || { color: 'text-secondary bg-surface-container border-outline-variant', icon: 'info' };
    return config;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-2xl">
        <div className="p-md border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">Pengaturan</h3>
          <button onClick={onClose} className="p-2 rounded-full text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="border-b border-outline-variant p-md">
          <div className="flex flex-col sm:flex-row gap-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-md py-sm rounded-lg text-label-md font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-md space-y-lg max-h-[70vh] overflow-y-auto">
          {/* ─── TAB: Konfigurasi Kas ─────────────────────────────── */}
          <div className={activeTab !== 'kas' ? 'hidden' : ''}>
            {/* Nominal Kas Wajib */}
            <div className="glass-panel p-md rounded-lg mb-md">
              <h4 className="font-label-md text-label-md text-on-surface mb-xs">Nominal Kas Wajib</h4>
              <p className="font-body-sm text-sm text-on-surface-variant mb-sm">Atur jumlah nominal iuran kas wajib per periode.</p>
              <label className="font-label-sm text-label-sm text-on-surface-variant">Nominal Iuran Wajib (Rp)</label>
              <input
                type="number"
                value={weeklyFee}
                onChange={(e) => setWeeklyFee(e.target.value)}
                className="w-full mt-xs mb-sm px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                placeholder="Masukkan nominal kas wajib..."
              />
              <div className="flex justify-end items-center gap-sm">
                {configMsg && <span className="text-sm text-green-400">{configMsg}</span>}
                <button
                  onClick={saveSettings}
                  disabled={!isKasConfigValid}
                  className={`px-md py-sm rounded-lg font-medium transition-all duration-200 ${
                    !isKasConfigValid
                      ? 'bg-slate-600 text-slate-400 opacity-50 cursor-not-allowed'
                      : 'bg-primary text-on-primary hover:bg-primary/90 shadow-lg shadow-primary/20'
                  }`}
                >
                  Simpan
                </button>
              </div>
            </div>

            {/* Dua kolom kategori */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              {/* Kategori Pemasukan */}
              <div className="glass-panel p-md rounded-lg">
                <h4 className="font-label-md text-label-md text-on-surface mb-xs">Kategori Pemasukan</h4>
                <p className="font-body-sm text-sm text-on-surface-variant mb-sm">Kelola kategori untuk transaksi pemasukan.</p>

                <div className="flex gap-sm mb-sm">
                  <input
                    type="text"
                    value={newIncomeCategory}
                    onChange={(e) => setNewIncomeCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIncomeCategory()}
                    className="flex-1 px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                    placeholder="Nama kategori baru..."
                  />
                  <button
                    onClick={handleAddIncomeCategory}
                    className="px-sm py-sm bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>

                <div className="space-y-xs max-h-[200px] overflow-y-auto">
                  {incomeCategories.length ? incomeCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between px-sm py-xs rounded-lg bg-surface-container border border-outline-variant/50">
                      <span className="font-body-md text-sm text-on-surface">{cat.name}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-error hover:text-error/80 transition-colors p-xs"
                        title="Hapus kategori"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  )) : (
                    <p className="text-sm text-on-surface-variant text-center py-sm">Belum ada kategori pemasukan.</p>
                  )}
                </div>
              </div>

              {/* Kategori Pengeluaran */}
              <div className="glass-panel p-md rounded-lg">
                <h4 className="font-label-md text-label-md text-on-surface mb-xs">Kategori Pengeluaran</h4>
                <p className="font-body-sm text-sm text-on-surface-variant mb-sm">Kelola kategori untuk transaksi pengeluaran.</p>

                <div className="flex gap-sm mb-sm">
                  <input
                    type="text"
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExpenseCategory()}
                    className="flex-1 px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                    placeholder="Nama kategori baru..."
                  />
                  <button
                    onClick={handleAddExpenseCategory}
                    className="px-sm py-sm bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>

                <div className="space-y-xs max-h-[200px] overflow-y-auto">
                  {expenseCategories.length ? expenseCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between px-sm py-xs rounded-lg bg-surface-container border border-outline-variant/50">
                      <span className="font-body-md text-sm text-on-surface">{cat.name}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-error hover:text-error/80 transition-colors p-xs"
                        title="Hapus kategori"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  )) : (
                    <p className="text-sm text-on-surface-variant text-center py-sm">Belum ada kategori pengeluaran.</p>
                  )}
                </div>
              </div>
            </div>

            {categoryMsg && (
              <p className="mt-sm text-sm text-error">{categoryMsg}</p>
            )}
          </div>

          {/* ─── TAB: Keamanan Akun ──────────────────────────────── */}
          <div className={activeTab !== 'keamanan' ? 'hidden' : ''}>
            <div className="glass-panel p-md rounded-lg">
              <h4 className="font-label-md text-label-md text-on-surface mb-xs">Keamanan Akun</h4>
              <form onSubmit={handleChangePassword} className="space-y-sm">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Password Saat Ini</label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Password Baru</label>
                  <input
                    type="password"
                    value={passwords.newPwd}
                    onChange={(e) => setPasswords({ ...passwords, newPwd: e.target.value })}
                    className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Konfirmasi Password</label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                  />
                </div>
                <div className="flex justify-between items-center">
                  {canAccessAuditLog && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('audit')}
                      className="px-md py-sm bg-surface-container-high text-primary border border-primary/20 rounded-lg hover:bg-surface-container transition-colors"
                    >
                      Lihat Riwayat Audit
                    </button>
                  )}
                  <button type="submit" className="px-md py-sm bg-primary text-on-primary rounded-lg">Ubah Password</button>
                </div>
              </form>
              {msg && <p className="mt-sm text-secondary">{msg}</p>}
            </div>
          </div>

          {/* ─── TAB: Audit Log ───────────────────────────────────── */}
          <div className={activeTab !== 'audit' ? 'hidden' : ''}>
            {userLoading ? (
              // Loading state while user data is being fetched
              <div className="glass-panel p-md rounded-lg flex items-center justify-center" style={{ minHeight: '300px' }}>
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-primary animate-spin mb-sm block">progress_activity</span>
                  <p className="font-body-md text-body-md text-on-surface-variant">Memuat data pengguna...</p>
                </div>
              </div>
            ) : !canAccessAuditLog ? (
              // Restricted access message for unauthorized users
              <div className="glass-panel p-md rounded-lg flex items-center justify-center" style={{ minHeight: '300px' }}>
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-sm block">lock</span>
                  <h4 className="font-headline-md text-headline-md text-on-surface mb-xs">🔒 Akses Terbatas</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Hanya Ketua dan Wakil Ketua yang dapat melihat log aktivitas organisasi.
                  </p>
                </div>
              </div>
            ) : (
              // Full audit log view for authorized users (ketua/wakil)
              <div className="glass-panel p-md rounded-lg space-y-lg">
                <div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-label-md text-label-md text-on-surface mb-xs">Audit Log</h4>
                      <p className="font-body-sm text-on-surface-variant">Pelacakan lengkap semua aktivitas penting untuk transparansi keuangan.</p>
                    </div>
                    <div className="flex items-center gap-sm">
                      <span className="font-body-sm text-secondary">Total: {loading ? 'Memuat...' : total}</span>
                      <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
                        aria-label="Tutup Audit Log"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>
                  </div>
                </div>

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant">Nama Pengguna</label>
                    <input
                      value={filterUsername}
                      onChange={(e) => { setFilterUsername(e.target.value); setOffset(0); }}
                      placeholder="Cari username..."
                      className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant">Jenis Aksi</label>
                    <select
                      value={filterAction}
                      onChange={(e) => { setFilterAction(e.target.value); setOffset(0); }}
                      className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                    >
                      <option value="">Semua Aksi</option>
                      {Object.keys(actionConfig).map((act) => (
                        <option key={act} value={act}>{act.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant">Dari Tanggal</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => { setFilterStartDate(e.target.value); setOffset(0); }}
                      className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface-variant">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => { setFilterEndDate(e.target.value); setOffset(0); }}
                      className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                    />
                  </div>
                </section>

                <div className="flex justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-md py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high"
                  >
                    Reset Filter
                  </button>
                  <div className="flex gap-xs">
                    <button
                      type="button"
                      onClick={handlePrevious}
                      disabled={offset === 0}
                      className="px-sm py-xs border border-outline-variant rounded disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={offset + limit >= total}
                      className="px-sm py-xs border border-outline-variant rounded disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-xs">
                  <button
                    type="button"
                    onClick={scrollLogsToTop}
                    className="px-sm py-xs border border-outline-variant rounded hover:bg-surface-container transition-colors"
                    aria-label="Scroll ke atas"
                  >
                    <span className="material-symbols-outlined">arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    onClick={scrollLogsToBottom}
                    className="px-sm py-xs border border-outline-variant rounded hover:bg-surface-container transition-colors"
                    aria-label="Scroll ke bawah"
                  >
                    <span className="material-symbols-outlined">arrow_downward</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <div ref={logsScrollRef} className="max-h-[55vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant">
                        <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Waktu</th>
                        <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Pengguna</th>
                        <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Aksi</th>
                        <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Target</th>
                        <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="py-sm px-md text-center text-on-surface-variant">Memuat...</td>
                        </tr>
                      ) : logs.length ? (
                        logs.map((log) => {
                          const badge = getActionBadge(log.action);
                          return (
                            <tr key={log.id} className="hover:bg-surface-container-high transition-colors group">
                              <td className="py-sm px-md font-body-md text-[13px] text-on-surface-variant whitespace-nowrap">{formatDate(log.createdAt)}</td>
                              <td className="py-sm px-md">
                                <span className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-surface-container border border-outline-variant font-label-md text-label-md text-on-surface">
                                  <span className="material-symbols-outlined text-[16px]">person</span>
                                  {log.username}
                                </span>
                              </td>
                              <td className="py-sm px-md">
                                <span className={`inline-flex items-center gap-xs px-sm py-xs rounded-full border font-label-md text-label-md ${badge.color}`}>
                                  <span className="material-symbols-outlined text-[16px]">{badge.icon}</span>
                                  {log.action.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-sm px-md font-label-md text-label-md text-on-surface-variant">
                                {log.targetType && log.targetId ? `${log.targetType}#${log.targetId}` : '—'}
                              </td>
                              <td className="py-sm px-md font-body-md text-[13px] text-on-surface max-w-xs truncate">{log.description || '—'}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" className="py-sm px-md text-center text-on-surface-variant">Tidak ada data audit</td>
                        </tr>
                      )}
                    </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── TAB: Manajemen Pengurus ──────────────────────────── */}
          <div className={activeTab !== 'pengurus' ? 'hidden' : ''}>
            <div className="glass-panel p-md rounded-lg space-y-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface mb-xs">Manajemen Pengurus</h4>
                  <p className="font-body-sm text-sm text-on-surface-variant">Kelola akun pengurus inti (Ketua, Wakil, Bendahara, Sekretaris) dan akses sistem.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewUserForm(!showNewUserForm)}
                  className="px-md py-sm bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Tambah Pengurus
                </button>
              </div>

              {adminMsg && (
                <div className="px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-sm text-on-surface">
                  {adminMsg}
                </div>
              )}

              {/* Tambah Pengurus Form */}
              {showNewUserForm && (
                <form onSubmit={handleCreateUser} className="bg-surface-container-low border border-outline-variant rounded-lg p-md space-y-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
                    <div>
                      <label className="font-label-sm text-label-sm text-on-surface-variant">Nama Lengkap</label>
                      <input
                        value={newUserForm.name}
                        onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                        className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                        placeholder="Nama pengurus..."
                      />
                    </div>
                    <div>
                      <label className="font-label-sm text-label-sm text-on-surface-variant">Email</label>
                      <input
                        type="email"
                        value={newUserForm.email}
                        onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                        className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="font-label-sm text-label-sm text-on-surface-variant">Role / Jabatan</label>
                      <select
                        value={newUserForm.role}
                        onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                        className="w-full mt-xs px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface"
                      >
                        {ROLE_OPTIONS.filter(r => r !== 'alumni').map(role => (
                          <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-sm pt-sm">
                    <button
                      type="button"
                      onClick={() => setShowNewUserForm(false)}
                      className="px-md py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-md py-sm bg-primary text-on-primary rounded-lg font-medium"
                    >
                      Simpan Pengurus Baru
                    </button>
                  </div>
                </form>
              )}

              {/* Table of Admin Users */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Nama</th>
                      <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Email</th>
                      <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Role / Jabatan</th>
                      <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Status</th>
                      <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {adminUsersLoading ? (
                      <tr><td colSpan="5" className="py-sm px-md text-center text-on-surface-variant">Memuat data...</td></tr>
                    ) : adminUsers.length ? (
                      adminUsers.map((u) => {
              const isAdminUser = u.username === 'dutophy@gmail.com';
              return (
              <tr key={u.id} className={`hover:bg-surface-container-high transition-colors ${isAdminUser ? 'opacity-60' : ''}`}>
                <td className="py-sm px-md font-body-md text-sm text-on-surface font-semibold">{u.name}</td>
                <td className="py-sm px-md font-body-md text-sm text-on-surface-variant">{u.email || u.username}</td>
                <td className="py-sm px-md">
                  <span className={`inline-block px-sm py-xs rounded text-xs font-medium border ${getRoleBadgeStyle(u.role)}`}>
                    {isAdminUser ? '🔒 Admin Sistem' : u.role}
                  </span>
                </td>
                <td className="py-sm px-md">
                  <span className={`inline-flex items-center gap-xs px-sm py-xs rounded-full text-xs font-medium ${
                    u.status === 'active'
                      ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                      : 'bg-gray-800/30 text-gray-400 border border-gray-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                    {u.status === 'active' ? 'Aktif' : 'Alumni'}
                  </span>
                </td>
                <td className="py-sm px-md">
                  <div className="flex items-center gap-sm flex-wrap">
                    {/* Role selector - locked for admin user */}
                    {isAdminUser ? (
                      <span className="px-sm py-xs rounded bg-surface-container border border-outline-variant text-xs text-on-surface-variant italic">
                        Tidak dapat diubah
                      </span>
                    ) : (
                      <>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-sm py-xs rounded bg-surface-container border border-outline-variant text-xs text-on-surface"
                          title="Ubah role"
                        >
                          {ROLE_OPTIONS.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>

                                  {/* Reset Password */}
                                  <button
                                    type="button"
                                    onClick={() => handleResetPassword(u.id, u.name)}
                                    className="px-sm py-xs rounded bg-amber-900/30 text-amber-400 border border-amber-500/30 text-xs hover:bg-amber-900/50 transition-colors"
                                    title="Reset password"
                                  >
                                    Reset Pwd
                                  </button>

                                  {/* Toggle Active/Alumni */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(u.id, u.status)}
                                    className={`px-sm py-xs rounded text-xs border transition-colors ${
                                      u.status === 'active'
                                        ? 'bg-red-900/30 text-red-400 border-red-500/30 hover:bg-red-900/50'
                                        : 'bg-green-900/30 text-green-400 border-green-500/30 hover:bg-green-900/50'
                                    }`}
                                    title={u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan kembali'}
                                  >
                                    {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan="5" className="py-sm px-md text-center text-on-surface-variant">Belum ada data pengurus.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
