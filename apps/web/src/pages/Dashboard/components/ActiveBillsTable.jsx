import { useAnggota } from '../../../lib/AnggotaContext';
import { createTransaction } from '../../../api';
import { useState } from 'react';

const ActiveBillsTable = ({ onBillPaid }) => {
  const { activeBills, markBillAsPaid } = useAnggota();
  const [loadingBillId, setLoadingBillId] = useState(null);

  const handleMarkAsPaid = async (bill) => {
    if (loadingBillId) return;
    setLoadingBillId(bill.id);

    try {
      // 1. Catat transaksi Pemasukan ke API
      await createTransaction({
        description: `Pelunasan Tagihan: ${bill.jenisTagihan} - ${bill.memberName}`,
        amount: bill.nominal,
        type: 'Pemasukan',
        category: 'Tagihan',
      });

      // 2. Hapus dari Global State (activeBills)
      markBillAsPaid(bill.id);

      // 3. Trigger reactivity ke Dashboard, Statistik, Pemasukan
      window.dispatchEvent(new Event("transactions:updated"));
      window.dispatchEvent(new Event("pemasukan:updated"));

      if (onBillPaid) onBillPaid(); // Refresh dashboard transactions

    } catch (err) {
      console.error("❌ Gagal menandai tagihan lunas:", err);
      alert("Gagal menandai tagihan lunas. Silakan coba lagi.");
    } finally {
      setLoadingBillId(null);
    }
  };

  if (activeBills.length === 0) return null;

  return (
    <div className="bg-surface-container p-md rounded-xl border border-surface-variant flex flex-col mt-gutter">
      <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-lg">Daftar Tagihan Aktif</h3>
      <div className="overflow-x-auto">
        <table className="w-full table-auto text-on-surface-variant">
          <thead>
            <tr className="border-b border-outline-variant text-left">
              <th className="py-sm pr-sm font-label-md">Anggota</th>
              <th className="py-sm px-sm font-label-md">Jenis Tagihan</th>
              <th className="py-sm px-sm font-label-md">Nominal</th>
              <th className="py-sm px-sm font-label-md">Deadline</th>
              <th className="py-sm pl-sm font-label-md">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {activeBills.map(bill => (
              <tr key={bill.id} className="border-b border-outline-variant last:border-b-0">
                <td className="py-sm pr-sm">
                  <p className="font-body-md text-on-surface">{bill.memberName}</p>
                  {bill.memberKelas && <p className="font-body-sm text-on-surface-variant">{bill.memberKelas}</p>}
                </td>
                <td className="py-sm px-sm font-body-md">{bill.jenisTagihan}</td>
                <td className="py-sm px-sm font-body-md">Rp {bill.nominal.toLocaleString('id-ID')}</td>
                <td className="py-sm px-sm font-body-md">
                  {bill.deadline ? new Date(bill.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                </td>
                <td className="py-sm pl-sm">
                  <button
                    type="button"
                    onClick={() => handleMarkAsPaid(bill)}
                    disabled={loadingBillId === bill.id}
                    className="px-sm py-xs rounded-lg bg-primary-container text-on-primary-container font-label-md disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {loadingBillId === bill.id ? 'Memproses...' : '✓ Tandai Lunas'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActiveBillsTable;
