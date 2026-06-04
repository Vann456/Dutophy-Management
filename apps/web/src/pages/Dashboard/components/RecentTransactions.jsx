// ─── WARNA DINAMIS ───────────────────────────────────────────────────────────
// Pemasukan → Hijau Soft (sinkron dengan COLOR.lunas di Statistik)
// Pengeluaran → Merah Soft (sinkron dengan COLOR.nunggak di Statistik)

const incomeColor  = '#6dbf9a';  // Soft Emerald
const expenseColor = '#c47f8a';  // Muted Rose

// Status badge colors (soft/pastel)
const statusColors = {
  'Approved': { bg: '#062D24', text: '#34D399', border: '#34D399' },      // Soft Green
  'Pending': { bg: '#2D220E', text: '#FBBF24', border: '#FBBF24' },       // Soft Yellow
  'Rejected': { bg: '#331518', text: '#F87171', border: '#F87171' },      // Soft Red
};

const RecentTransactions = ({ transactions = [], loading, onRefresh }) => {
  const transactionList = Array.isArray(transactions) ? transactions : [];
  const latestTransactions = [...transactionList]
    .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
    .slice(0, 8);

  return (
    <div className="bg-surface-container rounded-xl border border-surface-variant overflow-hidden">
      <div className="p-md border-b border-surface-variant flex justify-between items-center">
        <div>
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Transaksi Terakhir</h3>
          <p className="font-body-sm text-label-sm text-on-surface-variant">Ringkasan aktivitas kas terbaru.</p>
        </div>
        <button onClick={onRefresh} className="text-primary font-label-md text-label-md hover:underline" type="button">
          {loading ? 'Memuat...' : 'Segarkan'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-surface-variant">
              <th className="py-sm px-md font-label-md text-label-md text-on-surface-variant">Tanggal</th>
              <th className="py-sm px-md font-label-md text-label-md text-on-surface-variant">Deskripsi</th>
              <th className="py-sm px-md font-label-md text-label-md text-on-surface-variant">Kategori</th>
              <th className="py-sm px-md font-label-md text-label-md text-on-surface-variant text-right">Jumlah</th>
              <th className="py-sm px-md font-label-md text-label-md text-on-surface-variant">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="py-sm px-md text-center">Memuat transaksi...</td></tr>
            ) : latestTransactions.length ? (
              latestTransactions.map((tx) => {
                const isPemasukan = tx.type === 'Pemasukan';
                const color = isPemasukan ? incomeColor : expenseColor;
                return (
                  <tr key={tx.id} className="border-b border-surface-variant hover:bg-surface transition-colors">
                    <td className="py-sm px-md font-label-md text-label-md text-on-surface">
                      {new Date(tx.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-sm px-md font-label-md text-label-md text-on-surface font-semibold">
                      {tx.description}
                    </td>
                    {/* Kategori — warna dinamis */}
                    <td className="py-sm px-md font-label-md text-label-md font-semibold" style={{ color }}>
                      {tx.type}
                    </td>
                    {/* Jumlah — warna dinamis + prefix +/- */}
                    <td className="py-sm px-md font-label-md text-label-md text-right font-bold" style={{ color }}>
                      {isPemasukan ? '+' : '-'} Rp {Number(tx.amount || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="py-sm px-md">
                      <div className="flex flex-col gap-1">
<span 
  className={`inline-block px-sm py-xs rounded text-xs font-medium border`}
  style={{ 
    backgroundColor: statusColors[tx.status]?.bg || statusColors['Pending'].bg,
    color: statusColors[tx.status]?.text || statusColors['Pending'].text,
    borderColor: statusColors[tx.status]?.border || statusColors['Pending'].border,
    opacity: 0.7
  }}
>
  {tx.status || 'Pending'}
</span>
                        {tx.status === 'Rejected' && tx.rejectionReason && (
                           <span className="text-[10px] text-[#d56d6d] italic">
                             Reason: {tx.rejectionReason}
                           </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="5" className="py-sm px-md text-center">Belum ada transaksi.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentTransactions;
