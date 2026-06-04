const OverviewCards = ({ transactions = [], loading }) => {
  // Only include Approved transactions in calculations
  const approvedTransactions = transactions.filter(tx => tx.status === 'Approved');
  
  const totalIncome = approvedTransactions.reduce((sum, tx) => tx.type === 'Pemasukan' ? sum + Number(tx.amount || 0) : sum, 0);
  const totalExpense = approvedTransactions.reduce((sum, tx) => tx.type === 'Pengeluaran' ? sum + Number(tx.amount || 0) : sum, 0);
  const netCash = totalIncome - totalExpense;
  const latestDate = approvedTransactions[0]?.createdAt ? new Date(approvedTransactions[0].createdAt) : new Date();
  const lastUpdated = latestDate.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
      <div className="col-span-1 md:col-span-2 bg-surface-container p-md rounded-xl border border-surface-variant relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container opacity-30 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
        <div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Total Uang Kas</p>
          <h3 className="font-display-lg text-display-lg font-bold text-primary mt-sm">Rp {loading ? '–' : netCash.toLocaleString('id-ID')}</h3>
        </div>
        <div className="mt-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm">
          <div className="flex items-center text-success bg-success-container px-sm py-xs rounded-full">
            <span className="material-symbols-outlined text-[16px] mr-xs">trending_up</span>
            <span className="font-label-md text-label-md">{loading ? 'Memuat...' : `${((totalIncome / Math.max(1, totalExpense || 1)) * 100).toFixed(0)}% dari pengeluaran`}</span>
          </div>
          <span className="font-label-md text-label-md text-on-surface-variant">Terakhir diperbarui: {loading ? 'Memuat...' : lastUpdated}</span>
        </div>
      </div>

      <div className="grid grid-rows-2 gap-gutter">
        <div className="bg-surface-container p-md rounded-xl border border-surface-variant flex items-center justify-between">
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant">Pemasukan Bulan Ini</p>
            <p className="font-headline-md text-headline-md font-bold text-on-surface mt-xs">Rp {loading ? '–' : totalIncome.toLocaleString('id-ID')}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">arrow_downward</span>
          </div>
        </div>

        <div className="bg-surface-container p-md rounded-xl border border-surface-variant flex items-center justify-between">
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant">Pengeluaran Bulan Ini</p>
            <p className="font-headline-md text-headline-md font-bold text-on-surface mt-xs">Rp {loading ? '–' : totalExpense.toLocaleString('id-ID')}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-error">
            <span className="material-symbols-outlined">arrow_upward</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewCards;
