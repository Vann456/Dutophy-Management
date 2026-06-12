import { useEffect, useState, useCallback } from 'react';
import Layout from './components/layout/Layout';
import Login from './components/Login';
import Pemasukan from './components/Pemasukan';
import Pengeluaran from './components/Pengeluaran';
import AddTransactionModal from './components/modals/AddTransactionModal';
import AvatarCropModal from './components/AvatarCropModal';
import Anggota from './pages/Anggota/Anggota';
import Dashboard from './pages/Dashboard/Dashboard';
import Persetujuan from './pages/Persetujuan/Persetujuan';
import Riwayat from './pages/Riwayat/Riwayat';
import Statistik from './pages/Statistik/Statistik';
import { fetchAuthMe, login, register, updateAvatar, loginWithGoogle } from './api';
import { AnggotaProvider } from './lib/AnggotaContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const pageTitles = {
  dashboard: 'Overview Keuangan',
  pemasukan: 'Laporan Pemasukan',
  pengeluaran: 'Laporan Pengeluaran',
  riwayat: 'Riwayat Keuangan',
  statistik: 'Statistik',
  anggota: 'Anggota',
  persetujuan: 'Persetujuan',
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState(() => {
    const path = window.location.pathname.replace(/^\//, '');
    const validPages = new Set(['dashboard', 'pemasukan', 'pengeluaran', 'riwayat', 'statistik', 'anggota', 'persetujuan']);
    return validPages.has(path) ? path : 'dashboard';
  });
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'add-transaction' | null
  const [activeModalType, setActiveModalType] = useState('Pemasukan');
  const [activeModalCallback, setActiveModalCallback] = useState(null);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [avatarCacheBuster, setAvatarCacheBuster] = useState(Date.now());

  // Avatar crop flow state
  const [avatarCropImage, setAvatarCropImage] = useState(null);

  const handleOpenProfile = useCallback(() => {
    // Create a hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatarCropImage(ev.target.result);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  const handleCropComplete = useCallback(async (croppedFile) => {
    setAvatarCropImage(null);
    try {
      // ⚠️ CRITICAL: Only send FormData to our backend. NO @vercel/blob on client.
      const formData = new FormData();
      formData.append('file', croppedFile, 'avatar.jpg');
      
      const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').trim() || 'http://localhost:3001';
      const token = localStorage.getItem('token');
      
      const uploadHeaders = {};
      if (token) uploadHeaders.Authorization = `Bearer ${token}`;
      
      const uploadRes = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');
      
      // Save avatar URL to user record
      await updateAvatar(uploadData.url);
      
      // Immediately update local state with cache-buster
      setUser(prev => ({ ...prev, avatarUrl: uploadData.url }));
      setAvatarCacheBuster(Date.now());
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('avatar:updated', { detail: { avatarUrl: uploadData.url } }));
    } catch (err) {
      console.error('Avatar upload error:', err);
      alert('Gagal mengunggah foto profil: ' + err.message);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('dutophy_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    fetchAuthMe()
      .then((response) => {
        if (response?.user) {
          setUser(response.user);
          setIsAuthenticated(true);
          setActivePage(window.location.pathname.replace(/^\//, '') || 'dashboard');
        }
      })
      .catch((error) => {
        console.warn('Session refresh failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('dutophy_token');
        setIsAuthenticated(false);
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogin = async ({ username, password }) => {
    try {
      const response = await login({ username, password });
      const { token, user: authUser } = response;
      localStorage.setItem('token', token);
      localStorage.removeItem('dutophy_token');
      setUser(authUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setActivePage('dashboard');
    } catch (error) {
      setAuthError(error.message || 'Login gagal');
      throw error;
    }
  };

  const handleGoogleLogin = async (credential) => {
    try {
      const response = await loginWithGoogle(credential);
      const { token, user: authUser } = response;
      localStorage.setItem('token', token);
      localStorage.removeItem('dutophy_token');
      setUser(authUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setActivePage('dashboard');
    } catch (error) {
      setAuthError(error.message || 'Login Google gagal');
      throw error;
    }
  };

  const handleRegister = async ({ username, password, name, email }) => {
    try {
      const response = await register({ username, password, name, email });
      const { token, user: authUser } = response;
      localStorage.setItem('token', token);
      localStorage.removeItem('dutophy_token');
      setUser(authUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setActivePage('dashboard');
    } catch (error) {
      setAuthError(error.message || 'Registrasi gagal');
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('dutophy_token');
    setIsAuthenticated(false);
    setUser(null);
    setActivePage('dashboard');
    window.location.href = '/';
  };

  const handleOpenAddTransaction = (type = 'Pemasukan', cb = null) => {
    setActiveModalType(type);
    setActiveModal('add-transaction');
    setActiveModalCallback(() => cb);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setActiveModalCallback(null);
  };

  const handleTransactionCreated = () => {
    setDashboardRefreshKey(prev => prev + 1);
    try {
      window.dispatchEvent(new Event('transactions:updated'));
    } catch (err) {
      console.warn('Could not dispatch transactions:updated event', err);
    }
  };

  const pages = {
    dashboard: <Dashboard user={user} key={dashboardRefreshKey} onOpenAddTransaction={handleOpenAddTransaction} />,
    pemasukan: <Pemasukan onOpenAddTransaction={handleOpenAddTransaction} />,
    pengeluaran: <Pengeluaran onOpenAddTransaction={handleOpenAddTransaction} />,
    riwayat: <Riwayat />,
    statistik: <Statistik />,
    anggota: <Anggota user={user} />,
    persetujuan: <Persetujuan user={user} />,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Memeriksa sesi pengguna...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} onGoogleLogin={handleGoogleLogin} error={authError} />;
  }

  // Pending role: show restricted screen instead of full dashboard
  if (user?.role === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="w-full max-w-md bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-amber-400 text-3xl">hourglass_top</span>
          </div>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-2">Menunggu Persetujuan</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            Akun Anda telah berhasil dibuat melalui Google. Silakan hubungi Ketua atau Admin untuk menyetujui akun Anda sebelum dapat mengakses dashboard.
          </p>
          <div className="bg-surface-container rounded-lg p-sm border border-outline-variant">
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Email: <span className="font-semibold text-on-surface">{user?.email}</span>
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Nama: <span className="font-semibold text-on-surface">{user?.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('dutophy_token');
              setIsAuthenticated(false);
              setUser(null);
            }}
            className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary hover:bg-primary/90 transition-colors"
          >
            Keluar
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnggotaProvider>
      <AddTransactionModal
        isOpen={activeModal === 'add-transaction'}
        onClose={handleCloseModal}
        onTransactionCreated={() => {
          handleTransactionCreated();
          try {
            if (typeof activeModalCallback === 'function') activeModalCallback();
          } catch (err) {
            console.warn('activeModalCallback threw', err);
          }
        }}
        initialType={activeModalType}
      />
      <AvatarCropModal
        isOpen={!!avatarCropImage}
        imageSrc={avatarCropImage}
        onClose={() => setAvatarCropImage(null)}
        onCropComplete={handleCropComplete}
      />
      <Layout
        activePage={activePage}
        onNavigate={setActivePage}
        title={pageTitles[activePage]}
        user={user}
        avatarCacheBuster={avatarCacheBuster}
        onLogout={handleLogout}
        onOpenAddTransaction={handleOpenAddTransaction}
        onOpenProfile={handleOpenProfile}
      >
        {pages[activePage]}
      </Layout>
    </AnggotaProvider>
  );
}

// Wrap the entire App with GoogleOAuthProvider
const AppWithGoogle = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const apiUrl = import.meta.env.VITE_API_URL || '';
  
  // Comprehensive environment logging for debugging
  console.log('🔧 Environment Debug Information:');
  console.log('  VITE_GOOGLE_CLIENT_ID:', clientId ? `✓ SET (${clientId.substring(0, 20)}...)` : '✗ EMPTY/MISSING');
  console.log('  VITE_API_URL:', apiUrl ? `✓ SET (${apiUrl})` : '✗ EMPTY/MISSING');
  console.log('  Build Mode:', import.meta.env.MODE);
  console.log('  Production:', import.meta.env.PROD);
  console.log('  Development:', import.meta.env.DEV);
  console.log('  All env keys:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
  
  if (!clientId) {
    console.error('❌ CRITICAL: VITE_GOOGLE_CLIENT_ID is empty. Google OAuth will fail.');
    alert('Warning: Google OAuth is not configured. Please check environment variables.');
  }
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  );
};

export default AppWithGoogle;
