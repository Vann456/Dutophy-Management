import { useEffect, useState } from 'react';
import Layout from './components/layout/Layout';
import Login from './components/Login';
import Pemasukan from './components/Pemasukan';
import Pengeluaran from './components/Pengeluaran';
import AddTransactionModal from './components/modals/AddTransactionModal';
import Anggota from './pages/Anggota/Anggota';
import Dashboard from './pages/Dashboard/Dashboard';
import Persetujuan from './pages/Persetujuan/Persetujuan';
import Riwayat from './pages/Riwayat/Riwayat';
import Statistik from './pages/Statistik/Statistik';
import { fetchAuthMe, login, register } from './api';
import { AnggotaProvider } from './lib/AnggotaContext';

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
      window.location.href = '/dashboard';
    } catch (error) {
      setAuthError(error.message || 'Login gagal');
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
      window.location.href = '/dashboard';
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
    return <Login onLogin={handleLogin} onRegister={handleRegister} error={authError} />;
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
      <Layout
        activePage={activePage}
        onNavigate={setActivePage}
        title={pageTitles[activePage]}
        user={user}
        onLogout={handleLogout}
        onOpenAddTransaction={handleOpenAddTransaction}
      >
        {pages[activePage]}
      </Layout>
    </AnggotaProvider>
  );
}

export default App;
