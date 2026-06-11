import { useEffect, useState } from 'react';
import OverviewCards from './components/OverviewCards';
import CashFlowChart from './components/CashFlowChart';
import QuickActions from './components/QuickActions';
import RecentTransactions from './components/RecentTransactions';
import ActiveBillsTable from './components/ActiveBillsTable'; // Import the new component

const Dashboard = ({ user, onOpenAddTransaction }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fungsi untuk me-load data transaksi dari backend dengan fallback parsing
  const loadTransactions = async () => {
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001').trim() || 'http://localhost:3001';
    const headers = {
      'Content-Type': 'application/json',
      ...(localStorage.getItem('token') || localStorage.getItem('dutophy_token') ? { Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('dutophy_token')}` } : {}),
    };

    const parseTransactions = (json) => {
      if (Array.isArray(json)) return json;
      if (Array.isArray(json.transactions)) return json.transactions;
      if (Array.isArray(json.data)) return json.data;
      return [];
    };

    const fetchFrom = async (path) => {
      const response = await fetch(`${apiBase}${path}`, { headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response.json();
    };

    try {
      setLoading(true);
      setError(null);

      let json = await fetchFrom('/api/transactions');
      let rows = parseTransactions(json);

      if (!rows.length && json && typeof json === 'object' && !Array.isArray(json)) {
        // fallback to legacy endpoint if /api/transactions returns object payload
        json = await fetchFrom('/transactions');
        rows = parseTransactions(json);
      }

      setTransactions(rows);
      console.log(`✓ Dashboard: Loaded ${rows.length} transactions from ${Array.isArray(json) ? '/transactions' : '/api/transactions'}`);
    } catch (err) {
      console.error('❌ Failed to load dashboard transactions:', err);
      setError('Gagal memuat data transaksi. Silakan coba refresh halaman.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load transactions saat component mount
  useEffect(() => {
    loadTransactions();
  }, []);

  // Listen for global transaction update events
  useEffect(() => {
    const handleTransactionUpdate = () => {
      console.log('📊 Dashboard: Detected transaction update event, refreshing...');
      loadTransactions();
    };

    window.addEventListener('transactions:updated', handleTransactionUpdate);
    return () => window.removeEventListener('transactions:updated', handleTransactionUpdate);
  }, []);

  const handleRefresh = async () => {
    console.log('🔄 Dashboard: Manual refresh triggered');
    await loadTransactions();
  };

  return (
    <>
      <div className="flex flex-col gap-xs">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-sm">
          <div>
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-primary">Halo, {user?.name || 'Bendahara'}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Ringkasan aktivitas keuangan Dutophy dan status transaksi terbaru.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-error-container border border-error rounded-lg p-md text-error">
          <p className="font-body-md">{error}</p>
        </div>
      )}

      <OverviewCards transactions={transactions} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-stretch">
        <CashFlowChart transactions={transactions} />
        <QuickActions user={user} onTransactionCreated={loadTransactions} onOpenAddTransaction={onOpenAddTransaction} />
      </div>

      <RecentTransactions transactions={transactions} loading={loading} onRefresh={handleRefresh} />

      {/* New Active Bills Table */}
      <ActiveBillsTable onBillPaid={loadTransactions} />
    </>
  );
};

export default Dashboard;
