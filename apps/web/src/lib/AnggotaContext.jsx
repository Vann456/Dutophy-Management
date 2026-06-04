/**
 * AnggotaContext — Global State untuk data anggota, kas bulanan, dan kehadiran.
 * Persisten via localStorage agar data tidak hilang saat navigasi antar halaman.
 *
 * Structure dataStore:
 * {
 *   [year]: {
 *     [month]: {                    // month = 0-11
 *       [memberId]: {
 *         kas:   ['✓'|'✗', '✓'|'✗', '✓'|'✗', '✓'|'✗'],  // Minggu 1-4
 *         hadir: ['✓'|'A'|'S'|'I'|'-', ...],               // Minggu 1-4
 *       }
 *     }
 *   }
 * }
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createAttendance, createCashRecord, createMember, deleteMember, fetchAttendance, fetchCashRecords, fetchMembers, updateMember } from '../api';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
export const YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029];
export const KAS_OPTIONS   = ['✓', '✗', '-'];
export const HADIR_OPTIONS = ['✓', 'A', 'S', 'I', '-'];

const LS_KEY_STORE   = 'dcms_anggota_datastore';
const LS_KEY_MEMBERS = 'dcms_anggota_members';
const LS_KEY_BILLS   = 'dcms_active_bills'; // New key for active bills

// ─── HELPERS ────────────────────────────────────────────────────────────────

const readLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeLS = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
};

const periodKey = (year, month) => `${year}-${String(Number(month) + 1).padStart(2, '0')}`;
const normalizeCashStatus = (value) => (value === '–' ? '-' : value);

const applyWeekToStore = (prev, year, month, memberId, type, weekIndex, value) => {
  const yearData  = prev[year]  ?? {};
  const monthData = yearData[month] ?? {};
  const memberData = monthData[memberId] ?? {
    kas:   ['-', '-', '-', '-'],
    hadir: ['-', '-', '-', '-'],
  };
  const fallbackWeeks = type === 'kas' ? ['-', '-', '-', '-'] : ['-', '-', '-', '-'];
  const newWeeks = [...(memberData[type] ?? fallbackWeeks)];
  newWeeks[weekIndex] = type === 'kas' ? normalizeCashStatus(value) : value;

  return {
    ...prev,
    [year]: {
      ...yearData,
      [month]: {
        ...monthData,
        [memberId]: { ...memberData, [type]: newWeeks },
      },
    },
  };
};

// ─── CONTEXT ────────────────────────────────────────────────────────────────

const AnggotaContext = createContext(null);

export function AnggotaProvider({ children }) {
  const now = new Date();

  // Master data anggota (nama + kelas) — persisten
  const [members, setMembers] = useState(() => readLS(LS_KEY_MEMBERS, []));
  const [membersLoading, setMembersLoading] = useState(false);

  // dataStore — persisten
  const [dataStore, setDataStore] = useState(() => readLS(LS_KEY_STORE, {}));

  // Active bills — persisten
  const [activeBills, setActiveBills] = useState(() => readLS(LS_KEY_BILLS, []));

  // Filter aktif (tidak perlu persisten, reset ke bulan/tahun sekarang saat refresh)
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());

  // Sync ke localStorage setiap kali berubah
  useEffect(() => { writeLS(LS_KEY_MEMBERS, members); }, [members]);
  useEffect(() => { writeLS(LS_KEY_STORE, dataStore); }, [dataStore]);
  useEffect(() => { writeLS(LS_KEY_BILLS, activeBills); }, [activeBills]); // Sync active bills

  // ─── LOAD MEMBERS FROM API ─────────────────────────────────────────────────

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await fetchMembers();
      const list = res || [];
      setMembers(list);
    } catch (err) {
      console.error('AnggotaContext: gagal load members', err);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const loadAttendance = useCallback(async (year = selectedYear, month = selectedMonth) => {
    try {
      const period = periodKey(year, month);
      const rows = await fetchAttendance();
      const monthAttendance = (rows || []).filter(row => row.bulan === period);

      setDataStore(prev => {
        const yearData = prev[year] ?? {};
        const monthData = yearData[month] ?? {};
        const defaultKas = ['-', '-', '-', '-'];
        const defaultHadir = ['-', '-', '-', '-'];
        const memberIds = new Set([
          ...Object.keys(monthData),
          ...members.map(member => String(member.id)),
          ...monthAttendance.map(row => String(row.member_id ?? row.memberId ?? '')).filter(Boolean),
        ]);
        let nextMonthData = { ...monthData };

        memberIds.forEach(memberId => {
          const memberData = nextMonthData[memberId] ?? {};
          nextMonthData[memberId] = {
            ...memberData,
            kas: memberData.kas ?? defaultKas,
            hadir: defaultHadir,
          };
        });

        let next = {
          ...prev,
          [year]: {
            ...yearData,
            [month]: nextMonthData,
          },
        };

        monthAttendance.forEach(row => {
          const memberId = row.member_id ?? row.memberId;
          const weekIndex = Number(row.minggu_ke) - 1;
          if (!memberId || weekIndex < 0 || weekIndex > 3) return;
          next = applyWeekToStore(next, year, month, memberId, 'hadir', weekIndex, row.status || '-');
        });
        return next;
      });
    } catch (err) {
      console.error('AnggotaContext: gagal load attendance', err);
    }
  }, [members, selectedYear, selectedMonth]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const loadCashRecords = useCallback(async (year = selectedYear, month = selectedMonth) => {
    try {
      const period = periodKey(year, month);
      const rows = await fetchCashRecords();
      const monthCash = (rows || []).filter(row => row.bulan === period);

      setDataStore(prev => {
        const yearData = prev[year] ?? {};
        const monthData = yearData[month] ?? {};
        const defaultKas = ['-', '-', '-', '-'];
        const defaultHadir = ['-', '-', '-', '-'];
        const memberIds = new Set([
          ...Object.keys(monthData),
          ...members.map(member => String(member.id)),
          ...monthCash.map(row => String(row.member_id ?? row.memberId ?? '')).filter(Boolean),
        ]);
        let nextMonthData = { ...monthData };

        memberIds.forEach(memberId => {
          const memberData = nextMonthData[memberId] ?? {};
          nextMonthData[memberId] = {
            ...memberData,
            kas: defaultKas,
            hadir: memberData.hadir ?? defaultHadir,
          };
        });

        let next = {
          ...prev,
          [year]: {
            ...yearData,
            [month]: nextMonthData,
          },
        };

        monthCash.forEach(row => {
          const memberId = row.member_id ?? row.memberId;
          const weekIndex = Number(row.minggu_ke) - 1;
          if (!memberId || weekIndex < 0 || weekIndex > 3) return;
          next = applyWeekToStore(next, year, month, memberId, 'kas', weekIndex, normalizeCashStatus(row.status || '-'));
        });
        return next;
      });
    } catch (err) {
      console.error('AnggotaContext: gagal load cash', err);
    }
  }, [members, selectedYear, selectedMonth]);

  useEffect(() => { loadCashRecords(); }, [loadCashRecords]);

  // ─── DATA STORE HELPERS ────────────────────────────────────────────────────

  const getMonthData = useCallback((year, month) => {
    return dataStore[year]?.[month] ?? {};
  }, [dataStore]);

  const setMonthData = useCallback((year, month, data) => {
    setDataStore(prev => ({
      ...prev,
      [year]: { ...(prev[year] ?? {}), [month]: data },
    }));
  }, []);

  /** Ambil array 4 minggu untuk satu anggota, satu tipe ('kas'|'hadir') */
  const getMemberWeeks = useCallback((memberId, type, year, month) => {
    const y = year  ?? selectedYear;
    const m = month ?? selectedMonth;
    const md = getMonthData(y, m)[memberId];
    if (!md) return type === 'kas' ? ['-', '-', '-', '-'] : ['-', '-', '-', '-'];
    return md[type] ?? (type === 'kas' ? ['-', '-', '-', '-'] : ['-', '-', '-', '-']);
  }, [getMonthData, selectedYear, selectedMonth]);

  /** Update satu sel minggu */
  const updateMemberWeek = useCallback(async (memberId, type, weekIndex, value) => {
    const normalizedValue = type === 'kas' ? normalizeCashStatus(value) : value;
    setDataStore(prev => applyWeekToStore(prev, selectedYear, selectedMonth, memberId, type, weekIndex, normalizedValue));

    try {
      const saveWeek = type === 'kas' ? createCashRecord : createAttendance;
      await saveWeek({
        memberId,
        bulan: periodKey(selectedYear, selectedMonth),
        minggu_ke: weekIndex + 1,
        status: normalizedValue,
      });
    } catch (err) {
      console.error(`AnggotaContext: gagal save ${type}`, err);
      if (type === 'kas') {
        await loadCashRecords(selectedYear, selectedMonth);
      } else {
        await loadAttendance(selectedYear, selectedMonth);
      }
      alert('Gagal menyimpan data ke server. Data terbaru sudah dimuat ulang.');
    }
  }, [selectedYear, selectedMonth, loadAttendance, loadCashRecords]);

  // ─── MEMBER CRUD ───────────────────────────────────────────────────────────

  const addMember = useCallback(async ({ nama, kelas }) => {
    const res = await createMember({ nama, kelas });
    const newMember = Array.isArray(res) ? res[0] : res;
    if (newMember?.id) {
      // Inisialisasi slot kosong di bulan/tahun aktif
      setDataStore(prev => {
        const yearData  = prev[selectedYear]  ?? {};
        const monthData = yearData[selectedMonth] ?? {};
        return {
          ...prev,
          [selectedYear]: {
            ...yearData,
            [selectedMonth]: {
              ...monthData,
              [newMember.id]: { kas: ['-', '-', '-', '-'], hadir: ['-', '-', '-', '-'] },
            },
          },
        };
      });
    }
    await loadMembers();
    return newMember;
  }, [selectedYear, selectedMonth, loadMembers]);

  const editMember = useCallback(async (id, { nama, kelas }) => {
    await updateMember(id, { nama, kelas });
    await loadMembers();
  }, [loadMembers]);

  const removeMember = useCallback(async (id) => {
    await deleteMember(id);
    // Hapus dari semua tahun/bulan di dataStore
    setDataStore(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      Object.keys(updated).forEach(year => {
        Object.keys(updated[year]).forEach(month => {
          delete updated[year][month][id];
        });
      });
      return updated;
    });
    await loadMembers();
  }, [loadMembers]);

  // ─── ACTIVE BILLS (TAGIHAN AKTIF) ──────────────────────────────────────────

  const addBill = useCallback((bill) => {
    setActiveBills(prev => [...prev, bill]);
  }, []);

  const markBillAsPaid = useCallback((billId) => {
    setActiveBills(prev => prev.filter(bill => bill.id !== billId));
    // TODO: Add to transactions / riwayat pemasukan
  }, []);

  // ─── FILTER HANDLERS ──────────────────────────────────────────────────────

  const changeMonth = useCallback((newMonth) => {
    setSelectedMonth(newMonth);
    // Data bulan lama tetap tersimpan, bulan baru load dari dataStore (atau kosong)
  }, []);

  const changeYear = useCallback((newYear) => {
    setSelectedYear(newYear);
    // Data tahun baru mulai kosong (tidak ada di dataStore), tahun lama tetap tersimpan
  }, []);

  // ─── STATISTIK HELPERS (untuk Statistik.jsx) ──────────────────────────────

  /**
   * Hitung statistik kas untuk bulan/tahun tertentu.
   * Return: { lunas: N, nunggak: N, total: N }
   * Seorang anggota dianggap "Lunas" jika semua 4 minggu = '✓'.
   */
  const getKasStats = useCallback((year, month) => {
    const y = year  ?? selectedYear;
    const m = month ?? selectedMonth;
    const monthData = getMonthData(y, m);
    let lunas = 0, nunggak = 0;
    members.forEach(member => {
      const md = monthData[member.id];
      const weeks = md?.kas ?? ['-', '-', '-', '-'];
      // Only count explicitly evaluated weeks; "-" means not evaluated yet.
      const activeWeeks = weeks.filter(w => w !== '-' && w !== '–');
      if (activeWeeks.length === 0) {
        return;
      } else if (activeWeeks.every(w => w === '✓')) {
        lunas++;
      } else {
        nunggak++;
      }
    });
    return { lunas, nunggak, total: members.length };
  }, [members, getMonthData, selectedYear, selectedMonth]);

  /**
   * Hitung statistik kehadiran untuk bulan/tahun tertentu.
   * Abaikan '-' dari pembagi.
   * Return: { hadir: N, alpha: N, sakit: N, izin: N, total: N }
   */
  const getHadirStats = useCallback((year, month) => {
    const y = year  ?? selectedYear;
    const m = month ?? selectedMonth;
    const monthData = getMonthData(y, m);
    let hadir = 0, alpha = 0, sakit = 0, izin = 0;
    members.forEach(member => {
      const md = monthData[member.id];
      const weeks = md?.hadir ?? ['-', '-', '-', '-'];
      weeks.forEach(w => {
        if (w === '✓') hadir++;
        else if (w === 'A') alpha++;
        else if (w === 'S') sakit++;
        else if (w === 'I') izin++;
        // '-' diabaikan
      });
    });
    const total = hadir + alpha + sakit + izin || 1;
    return { hadir, alpha, sakit, izin, total };
  }, [members, getMonthData, selectedYear, selectedMonth]);

  // ─── CONTEXT VALUE ────────────────────────────────────────────────────────

  const value = {
    // Data
    members,
    membersLoading,
    dataStore,
    activeBills,
    // Filter
    selectedMonth,
    selectedYear,
    changeMonth,
    changeYear,
    // Helpers
    getMemberWeeks,
    updateMemberWeek,
    // CRUD
    addMember,
    editMember,
    removeMember,
    loadMembers,
    loadAttendance,
    loadCashRecords,
    // Bills
    addBill,
    markBillAsPaid,
    // Statistik
    getKasStats,
    getHadirStats,
  };

  return (
    <AnggotaContext.Provider value={value}>
      {children}
    </AnggotaContext.Provider>
  );
}

export function useAnggota() {
  const ctx = useContext(AnggotaContext);
  if (!ctx) throw new Error('useAnggota must be used inside <AnggotaProvider>');
  return ctx;
}
