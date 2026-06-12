import { useEffect, useState } from 'react';
import OverviewCards from './components/OverviewCards';
import CashFlowChart from './components/CashFlowChart';
import QuickActions from './components/QuickActions';
import RecentTransactions from './components/RecentTransactions';
import ActiveBillsTable from './components/ActiveBillsTable'; // Import the new component
import { fetchTransactions } from '../../api';

const Dashboard = ({ user, onOpenAddTransaction }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load transactions using the shared api.js helper (respects VITE_API_URL)
  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const json = await fetchTransactions();
      // Normalize: backend may return a plain array or a wrapped object
      const rows = Array.isArray(json)
        ? json
        : (json?.transactions ?? json?.data ?? []);

      setTransactions(rows);
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
      loadTransactions();
    };

    window.addEventListener('transactions:updated', handleTransactionUpdate);
    return () => window.removeEventListener('transactions:updated', handleTransactionUpdate);
  }, []);

  const handleRefresh = async () => {
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
