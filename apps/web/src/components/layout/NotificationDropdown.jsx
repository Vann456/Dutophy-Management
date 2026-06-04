import { useEffect, useState, useRef } from 'react';
import { useAnggota } from '../../lib/AnggotaContext';

const NotificationDropdown = () => {
  const { members, selectedMonth, selectedYear, getKasStats, getMemberWeeks } = useAnggota();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  // Calculate nunggak count from AnggotaContext data for current month
  const { nunggak: nunggakCount } = getKasStats(selectedYear, selectedMonth);

  // Get list of nunggak members for the dropdown
  const nunggakMembers = members.filter((member) => {
    // Get the member's kas weeks for current month
    // Only explicitly marked "✗" weeks count as nunggak; "-" means not evaluated yet.
    const weeks = getMemberWeeks(member.id, 'kas', selectedYear, selectedMonth);
    const activeWeeks = weeks.filter(w => w !== '-' && w !== '–');
    return activeWeeks.some(w => w === '✗');
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-sm rounded-full bg-surface-container-high transition-all hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <span className="material-symbols-outlined text-on-surface">notifications</span>
        {nunggakCount > 0 && (
          <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-error text-[11px] text-white font-bold shadow-lg shadow-error/30">
            {nunggakCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl overflow-hidden z-40">
          {/* Header */}
          <div className="p-md border-b border-outline-variant bg-surface-container-low">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-label-md text-label-md text-on-surface font-semibold">Notifikasi Kas</p>
                <p className="font-body-sm text-sm text-on-surface-variant">Status iuran kas anggota</p>
              </div>
              {nunggakCount > 0 && (
                <span className="inline-flex items-center gap-xs rounded-full bg-error/15 px-3 py-1 text-xs font-bold text-error border border-error/20">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  {nunggakCount} belum bayar
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[350px] overflow-y-auto">
            {nunggakCount === 0 ? (
              <div className="py-8 text-center">
                <span className="material-symbols-outlined text-3xl text-green-400">check_circle</span>
                <p className="font-body-md text-sm text-on-surface mt-2 font-semibold">Semua anggota sudah lunas!</p>
              </div>
            ) : (
              <>
                {/* Summary banner */}
                <div className="px-md py-3 bg-red-950/30 border-b border-red-900/30">
                  <p className="text-sm font-bold text-red-400">
                    🚨 {nunggakCount} Anggota belum bayar kas bulan ini!
                  </p>
                </div>

                {/* Member list */}
                <div className="divide-y divide-outline-variant/30">
                  {nunggakMembers.map((member) => (
                    <div key={member.id} className="px-md py-3 hover:bg-surface-container transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-red-900/30 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-red-400 text-lg">person</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-body-md text-sm text-on-surface font-semibold truncate">{member.nama}</p>
                            <p className="font-body-sm text-xs text-on-surface-variant">{member.kelas || '—'}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-900/40 text-red-400 border border-red-500/30">
                            Belum Bayar
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-sm border-t border-outline-variant bg-surface-container-low">
            <button
              type="button"
              className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 transition-colors"
              onClick={() => setOpen(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
