import { useEffect, useState } from 'react';
import { createTransaction, fetchConfig } from '../../api';
import { MONTHS, YEARS, useAnggota } from '../../lib/AnggotaContext';

/**
 * PayDuesModal — Bayar Iuran dengan sinkronisasi Global State
 *
 * Alur submit:
 * 1. Catat transaksi Pemasukan ke API (kategori: Iuran)
 * 2. Update AnggotaContext → isi kas minggu 0..weeksCount-1 dengan '✓'
 * 3. Dispatch 'transactions:updated' + 'pemasukan:updated' → reactivity ke semua halaman
 */

const now = new Date();

const PayDuesModal = ({ isOpen, onClose, onPaid }) => {
  const { members, getMemberWeeks, updateMemberWeek } = useAnggota();

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedMonth,    setSelectedMonth]    = useState(now.getMonth());
  const [selectedYear,     setSelectedYear]     = useState(now.getFullYear());
  const [weeksCount,       setWeeksCount]       = useState(1);
  const [loading,          setLoading]          = useState(false);
  const [weeklyFee,        setWeeklyFee]        = useState(5000);

  // Load dynamic weekly fee from backend config
  useEffect(() => {
    if (!isOpen) return;
    loadWeeklyFee();
  }, [isOpen]);

  const loadWeeklyFee = async () => {
    try {
      const res = await fetchConfig();
      if (res?.success && res.data?.weeklyFee) {
        setWeeklyFee(Number(res.data.weeklyFee));
      }
    } catch (err) {
      console.error('Failed to load weekly fee config, using fallback:', err);
      // Fallback to localStorage for backward compatibility
      const settings = JSON.parse(localStorage.getItem('dutophy_settings') || '{}');
      setWeeklyFee(Number(settings.weeklyFee || 5000));
    }
  };

  // Reset form setiap kali modal dibuka
  useEffect(() => {
    if (!isOpen) return;
    setSelectedMemberId('');
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
    setWeeksCount(1);
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedMember  = members.find(m => String(m.id) === String(selectedMemberId)) ?? null;
  const totalAmount     = weeksCount * weeklyFee;

  // Preview 4 kotak status kas setelah submit
  const currentWeeks = selectedMember
    ? getMemberWeeks(selectedMember.id, 'kas', selectedYear, selectedMonth)
    : ['-', '-', '-', '-'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember) return alert('Pilih anggota terlebih dahulu');

    try {
      setLoading(true);

      // 1. Catat transaksi ke API
      await createTransaction({
        description: `Iuran ${MONTHS[selectedMonth]} ${selectedYear} — ${selectedMember.nama} (${weeksCount} minggu)`,
        amount: totalAmount,
        type: 'Pemasukan',
        category: 'Iuran',
      });

      // 2. Update Global State: isi minggu 0..weeksCount-1 dengan '✓'
      for (let wi = 0; wi < weeksCount; wi++) {
        await updateMemberWeek(selectedMember.id, 'kas', wi, '✓');
      }

      // 3. Trigger reactivity ke Dashboard, Statistik, Pemasukan
      window.dispatchEvent(new Event('transactions:updated'));
      window.dispatchEvent(new Event('pemasukan:updated'));

      if (onPaid) onPaid();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal mencatat pembayaran');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-2xl"
      >
        {/* ── Header ── */}
        <div className="p-md border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface">Bayar Iuran</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-full text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-md space-y-md">

          {/* Pilih Anggota */}
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
              Pilih Anggota
            </label>
            <select
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              className="w-full px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
              required
            >
              <option value="">-- Pilih Anggota --</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nama}{m.kelas ? ` — ${m.kelas}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Bulan & Tahun */}
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Bulan</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="w-full px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">Tahun</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Jumlah Minggu */}
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
              Jumlah Pertemuan / Minggu yang Dibayar (1–4)
            </label>
            <input
              type="number"
              min="1"
              max="4"
              value={weeksCount}
              onChange={e => setWeeksCount(Math.min(4, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="text-secondary text-[12px] mt-xs">
              Total: Rp {totalAmount.toLocaleString('id-ID')}
            </p>
            <p className="text-secondary text-[12px] mt-xs">
              Minggu 1 s/d {weeksCount} akan otomatis ditandai ✓ Lunas
            </p>
          </div>

          {/* Preview status kas */}
          {selectedMember && (
            <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-sm">
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-sm">
                Preview Status Kas — {MONTHS[selectedMonth]} {selectedYear}
              </p>
              <div className="flex gap-sm">
                {[0, 1, 2, 3].map(wi => {
                  const willBePaid = wi < weeksCount;
                  const display    = willBePaid ? '✓' : currentWeeks[wi];
                  return (
                    <div key={wi} className="flex flex-col items-center gap-xs">
                      <span className="text-[10px] text-secondary">M{wi + 1}</span>
                      <span
                        className="w-9 h-9 rounded-lg border-2 flex items-center justify-center text-sm font-bold"
                        style={
                          willBePaid
                            ? { background: '#0d2318', color: '#6dbf9a', borderColor: '#4e8c6e' }
                            : display === '✗'
                              ? { background: '#2b1018', color: '#c47f8a', borderColor: '#8c4e5a' }
                              : { background: '#1a1e22', color: '#8899aa', borderColor: '#4a5568' }
                        }
                      >
                        {display}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ringkasan nominal */}
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-sm flex justify-between items-center">
            <span className="font-label-md text-label-md text-on-surface-variant">
              {weeksCount} minggu × Rp {weeklyFee.toLocaleString('id-ID')}
            </span>
            <span className="font-headline-sm text-headline-sm font-bold" style={{ color: '#6dbf9a' }}>
              Rp {totalAmount.toLocaleString('id-ID')}
            </span>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="p-md border-t border-outline-variant flex justify-end gap-sm bg-surface-container-lowest">
          <button
            type="button"
            onClick={onClose}
            className="px-md py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || !selectedMember}
            className="px-md py-sm rounded-lg bg-primary-container text-on-primary-container font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? 'Memproses...' : 'Konfirmasi Pembayaran'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PayDuesModal;
