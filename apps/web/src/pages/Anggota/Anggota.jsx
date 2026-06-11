import { useEffect, useRef, useState } from 'react';
import { MONTHS, YEARS, useAnggota } from '../../lib/AnggotaContext';

// ─── COLOR CONFIG — sinkron persis dengan COLOR di Statistik.jsx ─────────────
//
// Statistik.jsx:
//   lunas/hadir  = #4e8c6e  (Emerald Muted)
//   nunggak/alpha= #8c4e5a  (Maroon Pastel)
//   sakit        = #8a7a4a  (Soft Khaki Amber)
//   izin         = #4a6e8a  (Deep Slate Blue)
//
// Setiap style: bg pucat (opacity ~15%), border warna solid, teks warna solid

const KAS_STYLE = {
  '✓': {
    // Emerald Muted — bg pucat hijau, teks hijau tua
    btn:   'bg-[#0d2318] text-[#6dbf9a] border-[#4e8c6e] hover:bg-[#112b1e]',
    label: '✓',
  },
  '✗': {
    // Maroon Pastel — bg pucat merah maroon, teks merah maroon
    btn:   'bg-[#2b1018] text-[#c47f8a] border-[#8c4e5a] hover:bg-[#351420]',
    label: '✗',
  },
  '-': {
    // Soft Slate Gray — no meeting held
    btn:   'bg-[#1a1e22] text-[#8899aa] border-[#4a5568] hover:bg-[#1e2328]',
    label: '-',
  },
};

const HADIR_STYLE = {
  '✓': {
    // Emerald Muted — sinkron dengan COLOR.hadir (#5b8fa8 → tapi hadir pakai emerald)
    btn:   'bg-[#0d2318] text-[#6dbf9a] border-[#4e8c6e] hover:bg-[#112b1e]',
    label: '✓',
    short: '✓',
  },
  'A': {
    // Maroon Pastel — sinkron dengan COLOR.alpha (#8c4e5a)
    btn:   'bg-[#2b1018] text-[#c47f8a] border-[#8c4e5a] hover:bg-[#351420]',
    label: 'A',
    short: 'A',
  },
  'S': {
    // Soft Khaki Amber — sinkron dengan COLOR.sakit (#8a7a4a)
    btn:   'bg-[#26200d] text-[#c4a85a] border-[#8a7a4a] hover:bg-[#2e2710]',
    label: 'S',
    short: 'S',
  },
  'I': {
    // Deep Slate Blue — sinkron dengan COLOR.izin (#4a6e8a)
    btn:   'bg-[#0d1a26] text-[#7aaac4] border-[#4a6e8a] hover:bg-[#10202e]',
    label: 'I',
    short: 'I',
  },
  '-': {
    // Soft Slate Gray — netral
    btn:   'bg-[#1a1e22] text-[#8899aa] border-[#4a5568] hover:bg-[#1e2328]',
    label: '-',
    short: '-',
  },
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

const calcKasStatus = (weeks) => {
  // Count only explicitly evaluated weeks; "-" means tidak ada/not evaluated.
  const activeWeeks = weeks.filter(w => w !== '-' && w !== '–');
  const unpaid = activeWeeks.filter(w => w === '✗').length;
  if (activeWeeks.length === 0) {
    return { badge: 'bg-[#1a1e22] text-[#8899aa] border border-[#4a5568]', text: '-' };
  }
  return unpaid === 0
    ? { badge: 'bg-[#0d2318] text-[#6dbf9a] border border-[#4e8c6e]', text: '✓ Lunas' }
    : { badge: 'bg-[#2b1018] text-[#c47f8a] border border-[#8c4e5a]', text: `✗ ${unpaid}` };
};

// ─── CUSTOM KAS DROPDOWN ─────────────────────────────────────────────────────
// Menggunakan <select> biasa tapi dengan inline style agar warna tidak menular.
// Karena <option> tidak bisa di-style cross-browser, kita pakai custom popover.

function KasDropdown({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Tutup saat klik di luar
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const style = KAS_STYLE[value] ?? KAS_STYLE['-'];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(o => !o);
        }}
        className={`h-9 rounded-lg border-2 font-bold text-base flex items-center justify-center gap-1 px-3 min-w-[3.5rem] transition-colors ${disabled ? 'cursor-default opacity-90 pointer-events-none' : 'cursor-pointer'} ${style.btn}`}
        title={disabled ? 'Read-only' : undefined}
      >
        {style.label}
        {!disabled && <span className="material-symbols-outlined text-[11px] opacity-50">expand_more</span>}
      </button>
      {open && !disabled && (
        <div className="absolute z-50 top-full mt-1 left-0 rounded-lg shadow-2xl overflow-hidden min-w-[80px] border border-gray-700">
          {Object.entries(KAS_STYLE).map(([opt, s]) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full px-3 py-2 text-sm font-bold text-left transition-colors ${s.btn} ${opt === value ? 'ring-2 ring-inset ring-current' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CUSTOM HADIR DROPDOWN ───────────────────────────────────────────────────
// Custom popover — TIDAK menggunakan <select>/<option> agar warna tidak menular.

function HadirDropdown({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const style = HADIR_STYLE[value] ?? HADIR_STYLE['-'];

  return (
    <div ref={ref} className="relative inline-block">
      {/* Tombol trigger — kotak gelap + border + teks cerah sesuai nilai aktif */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(o => !o);
        }}
        className={`h-9 rounded-lg border-2 font-bold text-base flex items-center justify-center gap-1 px-3 min-w-[3.5rem] transition-colors ${disabled ? 'cursor-default opacity-90 pointer-events-none' : 'cursor-pointer'} ${style.btn}`}
        title={disabled ? 'Read-only' : undefined}
      >
        <span>{style.short}</span>
        {!disabled && <span className="material-symbols-outlined text-[11px] opacity-50">expand_more</span>}
      </button>

      {/* Popover menu — setiap item punya warna TETAP miliknya sendiri */}
      {open && !disabled && (
        <div className="absolute z-50 top-full mt-1 left-0 rounded-lg shadow-2xl overflow-hidden min-w-[80px] border border-gray-700">
          {Object.entries(HADIR_STYLE).map(([opt, s]) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full px-3 py-2 text-sm font-bold text-left transition-colors ${s.btn} ${opt === value ? 'ring-2 ring-inset ring-current' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LEGEND DINAMIS ──────────────────────────────────────────────────────────

function LegendKas() {
  return (
    <div className="flex items-center gap-sm flex-wrap">
      <span className="inline-flex items-center gap-xs px-3 py-1 rounded-lg text-sm font-bold bg-[#0d2318] text-[#6dbf9a] border-2 border-[#4e8c6e]">
        ✓ Lunas
      </span>
      <span className="inline-flex items-center gap-xs px-3 py-1 rounded-lg text-sm font-bold bg-[#2b1018] text-[#c47f8a] border-2 border-[#8c4e5a]">
        ✗ Nunggak
      </span>
      <span className="inline-flex items-center gap-xs px-3 py-1 rounded-lg text-sm font-bold bg-[#1a1e22] text-[#8899aa] border-2 border-[#4a5568]">
        - None
      </span>
    </div>
  );
}

function LegendHadir() {
  const items = [
    { short: '✓', label: 'Hadir', bg: '#0d2318', text: '#6dbf9a', border: '#4e8c6e' },
    { short: 'A', label: 'Alpha', bg: '#2b1018', text: '#c47f8a', border: '#8c4e5a' },
    { short: 'S', label: 'Sakit', bg: '#26200d', text: '#c4a85a', border: '#8a7a4a' },
    { short: 'I', label: 'Izin',  bg: '#0d1a26', text: '#7aaac4', border: '#4a6e8a' },
    { short: '-', label: 'None',  bg: '#1a1e22', text: '#8899aa', border: '#4a5568' },
  ];
  return (
    <div className="flex items-center gap-xs flex-wrap">
      {items.map(({ short, label, bg, text, border }) => (
        <span
          key={short}
          className="inline-flex items-center gap-xs px-3 py-1 rounded-lg text-sm font-bold border-2"
          style={{ background: bg, color: text, borderColor: border }}
        >
          <span className="font-mono">{short}</span>
          <span className="text-xs opacity-80">{label}</span>
        </span>
      ))}
    </div>
  );
}

// ─── FORM MODAL ─────────────────────────────────────────────────────────────

function MemberFormModal({ editTarget, onClose }) {
  const { addMember, editMember } = useAnggota();
  const [nama,   setNama]   = useState(editTarget?.nama  ?? '');
  const [kelas,  setKelas]  = useState(editTarget?.kelas ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget) {
        await editMember(editTarget.id, { nama, kelas });
      } else {
        await addMember({ nama, kelas });
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data anggota');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-low rounded-xl p-lg w-full max-w-md shadow-2xl border border-outline-variant"
      >
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-md">
          {editTarget ? 'Edit Anggota' : 'Tambah Anggota'}
        </h2>
        <div className="space-y-md">
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-xs">Nama</label>
            <input
              value={nama}
              onChange={e => setNama(e.target.value)}
              className="w-full border border-outline-variant rounded-lg p-sm bg-surface text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-xs">Kelas</label>
            <input
              value={kelas}
              onChange={e => setKelas(e.target.value)}
              className="w-full border border-outline-variant rounded-lg p-sm bg-surface text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
        </div>
        <div className="flex gap-md mt-lg">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-outline-variant text-on-surface py-sm rounded-lg hover:bg-surface-container transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-primary text-on-primary py-sm rounded-lg font-bold hover:bg-primary-fixed transition-colors disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── TABEL KAS ───────────────────────────────────────────────────────────────

function TabelKas({ onEdit, userRole, currentUsername }) {
  const canEditKas = currentUsername === 'admin' || userRole === 'ketua' || userRole === 'wakil' || userRole === 'bendahara';
  const { members, membersLoading, getMemberWeeks, updateMemberWeek, removeMember } = useAnggota();

  const handleDelete = async (id) => {
    if (!confirm('Hapus anggota ini? Data kas dan hadir di semua periode akan terhapus.')) return;
    try { await removeMember(id); }
    catch { alert('Gagal menghapus anggota'); }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[860px]">
        <thead>
          <tr className="bg-surface-container-low border-b border-outline-variant">
            <th className="py-sm px-md font-label-md text-label-md text-primary uppercase w-14">No</th>
            <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Nama</th>
            <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Kelas</th>
            <th className="py-sm px-md font-label-md text-label-md text-primary uppercase text-center" colSpan={4}>
              Status Kas
            </th>
            <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Keterangan</th>
            <th className="py-sm px-md font-label-md text-label-md text-primary uppercase text-right">Aksi</th>
          </tr>
          <tr className="bg-surface-container-low border-b border-outline-variant">
            <th colSpan={3} />
            {['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'].map(w => (
              <th key={w} className="py-xs px-md font-label-md text-[11px] text-secondary uppercase text-center">{w}</th>
            ))}
            <th colSpan={2} />
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {membersLoading ? (
            <tr><td colSpan={10} className="py-md text-center text-secondary">Memuat...</td></tr>
          ) : members.length === 0 ? (
            <tr><td colSpan={10} className="py-md text-center text-secondary">Belum ada anggota</td></tr>
          ) : members.map((member, idx) => {
            const weeks  = getMemberWeeks(member.id, 'kas');
            const status = calcKasStatus(weeks);
            return (
              <tr key={member.id} className="hover:bg-surface-container-high transition-colors">
                <td className="py-sm px-md text-center text-secondary">{idx + 1}</td>
                <td className="py-sm px-md font-semibold text-on-surface">{member.nama}</td>
                <td className="py-sm px-md text-secondary">{member.kelas}</td>
                {[0, 1, 2, 3].map(wi => (
                  <td key={wi} className="py-sm px-md text-center">
                    <KasDropdown
                      value={weeks[wi]}
                      disabled={!canEditKas}
                      onChange={val => updateMemberWeek(member.id, 'kas', wi, val)}
                    />
                  </td>
                ))}
                <td className="py-sm px-md">
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${status.badge}`}>
                    {status.text}
                  </span>
                </td>
                <td className="py-sm px-md">
                  {canEditKas && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(member)}
                        className="text-secondary hover:text-primary transition-colors p-xs rounded hover:bg-surface-container"
                        type="button"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="text-secondary hover:text-error transition-colors p-xs rounded hover:bg-surface-container"
                        type="button"
                        title="Hapus"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── TABEL HADIR ─────────────────────────────────────────────────────────────

function TabelHadir({ onEdit, userRole, currentUsername }) {
  const canEditHadir = currentUsername === 'admin' || userRole === 'ketua' || userRole === 'wakil' || userRole === 'sekretaris';
  const { members, membersLoading, getMemberWeeks, updateMemberWeek, removeMember } = useAnggota();

  const handleDelete = async (id) => {
    if (!confirm('Hapus anggota ini? Data kas dan hadir di semua periode akan terhapus.')) return;
    try { await removeMember(id); }
    catch { alert('Gagal menghapus anggota'); }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[860px]">
        <thead>
          <tr className="bg-surface-container-low border-b border-outline-variant">
            <th className="py-sm px-md font-label-md text-label-md text-primary uppercase w-14">No</th>
            <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Nama</th>
            <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">Kelas</th>
            <th className="py-sm px-md font-label-md text-label-md text-primary uppercase text-center" colSpan={4}>
              Status
            </th>
            <th className="py-sm px-md font-label-md text-label-md text-primary uppercase text-right">Aksi</th>
          </tr>
          <tr className="bg-surface-container-low border-b border-outline-variant">
            <th colSpan={3} />
            {['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'].map(w => (
              <th key={w} className="py-xs px-md font-label-md text-[11px] text-secondary uppercase text-center">{w}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {membersLoading ? (
            <tr><td colSpan={9} className="py-md text-center text-secondary">Memuat...</td></tr>
          ) : members.length === 0 ? (
            <tr><td colSpan={9} className="py-md text-center text-secondary">Belum ada anggota</td></tr>
          ) : members.map((member, idx) => {
            const weeks = getMemberWeeks(member.id, 'hadir');
            return (
              <tr key={member.id} className="hover:bg-surface-container-high transition-colors">
                <td className="py-sm px-md text-center text-secondary">{idx + 1}</td>
                <td className="py-sm px-md font-semibold text-on-surface">{member.nama}</td>
                <td className="py-sm px-md text-secondary">{member.kelas}</td>
                {[0, 1, 2, 3].map(wi => (
                  <td key={wi} className="py-sm px-md text-center">
                    <HadirDropdown
                      value={weeks[wi]}
                      disabled={!canEditHadir}
                      onChange={val => updateMemberWeek(member.id, 'hadir', wi, val)}
                    />
                  </td>
                ))}
                <td className="py-sm px-md">
                  {canEditHadir && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(member)}
                        className="text-secondary hover:text-primary transition-colors p-xs rounded hover:bg-surface-container"
                        type="button"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="text-secondary hover:text-error transition-colors p-xs rounded hover:bg-surface-container"
                        type="button"
                        title="Hapus"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function Anggota({ user }) {
  const currentUsername = user?.username;
  const currentUserRole = String(user?.role || '').toLowerCase().trim();
  const { selectedMonth, selectedYear, changeMonth, changeYear } = useAnggota();
  const [activeTab,  setActiveTab]  = useState('kas');
  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const openAdd   = ()       => { setEditTarget(null);   setShowForm(true); };
  const openEdit  = (member) => { setEditTarget(member); setShowForm(true); };
  const closeForm = ()       => { setShowForm(false); setEditTarget(null); };

  const handleYearChange = (newYear) => {
    if (window.confirm('Ganti tahun akan memulai periode baru. Data tahun lama tetap tersimpan. Lanjutkan?')) {
      changeYear(Number(newYear));
    }
  };

  return (
    <>
      {/* ── Judul ── */}
      <div>
        <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
          Daftar Anggota
        </h2>
        <p className="font-body-md text-body-md text-secondary mt-xs">
          Kelola data keanggotaan, status kas, dan rekap kehadiran bulanan.
        </p>
      </div>

      {/* ── Filter Global + Tambah Anggota ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col md:flex-row md:items-center justify-between gap-md">
        <div className="flex flex-wrap items-center gap-md">
          <div className="flex items-center gap-sm">
            <span className="font-label-md text-label-md text-secondary">Bulan</span>
            <select
              value={selectedMonth}
              onChange={e => changeMonth(Number(e.target.value))}
              className="px-md py-sm bg-surface border border-outline-variant rounded-lg text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 font-body-md text-[14px]"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-sm">
            <span className="font-label-md text-label-md text-secondary">Tahun</span>
            <select
              value={selectedYear}
              onChange={e => handleYearChange(e.target.value)}
              className="px-md py-sm bg-surface border border-outline-variant rounded-lg text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 font-body-md text-[14px]"
            >
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="bg-primary text-on-primary font-label-md text-label-md py-sm px-md rounded-lg hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors flex items-center justify-center gap-sm font-bold"
          type="button"
        >
          <span className="material-symbols-outlined">add</span>
          Tambah Anggota
        </button>
      </div>

      {/* ── Tab + Tabel ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-visible">
        {/* Tab Header */}
        <div className="border-b border-outline-variant bg-surface-container-low flex items-center justify-between pr-md flex-wrap gap-sm">
          <div className="flex">
            {[
              { key: 'kas',   label: 'Tabel Kas Bulanan' },
              { key: 'hadir', label: 'Tabel Daftar Hadir' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-md px-lg font-label-md text-label-md font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary-container text-primary border-b-2 border-primary'
                    : 'text-secondary hover:bg-surface-container-high'
                }`}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Legend Dinamis */}
          <div className="py-sm">
            {activeTab === 'kas' ? <LegendKas /> : <LegendHadir />}
          </div>
        </div>

        {/* Konten Tab — overflow-visible agar popover tidak terpotong */}
        <div className="overflow-x-auto overflow-y-visible">
          {activeTab === 'kas'
            ? <TabelKas   onEdit={openEdit} userRole={currentUserRole} currentUsername={currentUsername} />
            : <TabelHadir onEdit={openEdit} userRole={currentUserRole} currentUsername={currentUsername} />
          }
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <MemberFormModal editTarget={editTarget} onClose={closeForm} />
      )}
    </>
  );
}
