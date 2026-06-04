import { useState } from 'react';
import { useAnggota } from '../../lib/AnggotaContext';
import { createTransaction } from '../../api';

// ─── KONSTANTA ───────────────────────────────────────────────────────────────

const JENIS_TAGIHAN = [
  'Uang Seragam',
  'Kas Nunggak',
  'Uang Kegiatan',
  'Uang Konsumsi',
  'Uang Transportasi',
  'Lainnya',
];

// ─── GENERATOR PESAN WA ──────────────────────────────────────────────────────

function generateWAMessage({ memberName, jenisTagihan, nominal, deadline }) {
  const deadlineStr = deadline
    ? new Date(deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Segera';
  return `Halo ${memberName} 👋

Kami ingin menginformasikan bahwa kamu memiliki tagihan yang perlu diselesaikan:

📋 *Jenis Tagihan:* ${jenisTagihan}
💰 *Nominal:* Rp ${Number(nominal).toLocaleString('id-ID')}
📅 *Batas Waktu:* ${deadlineStr}

Mohon segera melakukan pembayaran sebelum batas waktu yang ditentukan.

Terima kasih 🙏
_— Bendahara Dutophy_`;
}

// ─── KOMPONEN ────────────────────────────────────────────────────────────────

const CreateInvoiceModal = ({ isOpen, onClose, onCreated }) => {
  const { members, addBill } = useAnggota();

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [jenisTagihan,     setJenisTagihan]     = useState('');
  const [nominal,          setNominal]          = useState('');
  const [deadline,         setDeadline]         = useState('');
  const [loading,          setLoading]          = useState(false);
  const [waMessage,        setWaMessage]        = useState('');
  const [copied,           setCopied]           = useState(false);

  if (!isOpen) return null;

  const selectedMember = members.find(m => String(m.id) === String(selectedMemberId)) ?? null;

  const handleReset = () => {
    setSelectedMemberId('');
    setJenisTagihan('');
    setNominal('');
    setDeadline('');
    setWaMessage('');
    setCopied(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedMember || !jenisTagihan || !nominal) {
      alert('Isi semua field wajib');
      return;
    }

    // Generate pesan WA
    const msg = generateWAMessage({
      memberName:   selectedMember.nama,
      jenisTagihan,
      nominal:      Number(nominal),
      deadline,
    });
    setWaMessage(msg);

    // Simpan tagihan ke Global State
    addBill({
      id:           Date.now(),
      memberId:     selectedMember.id,
      memberName:   selectedMember.nama,
      memberKelas:  selectedMember.kelas || '',
      jenisTagihan,
      nominal:      Number(nominal),
      deadline,
      createdAt:    new Date().toISOString(),
      status:       'aktif',
    });

    if (onCreated) {
      onCreated();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(waMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback untuk browser yang tidak support clipboard API
      const ta = document.createElement('textarea');
      ta.value = waMessage;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-md border-b border-outline-variant flex items-center justify-between flex-shrink-0">
          <h3 className="font-headline-md text-headline-md text-on-surface">Buat Tagihan</h3>
          <button type="button" onClick={handleClose} className="p-2 rounded-full text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── Form Input ── */}
          {!waMessage && (
            <form id="invoice-form" onSubmit={handleSubmit} className="p-md space-y-md">

              {/* Pilih Anggota */}
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                  Target Anggota <span className="text-error">*</span>
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

              {/* Jenis Tagihan */}
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                  Jenis Tagihan <span className="text-error">*</span>
                </label>
                <select
                  value={jenisTagihan}
                  onChange={e => setJenisTagihan(e.target.value)}
                  className="w-full px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">-- Pilih Jenis --</option>
                  {JENIS_TAGIHAN.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              {/* Nominal & Deadline */}
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                    Nominal (Rp) <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={nominal}
                    onChange={e => setNominal(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="w-full px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                  {nominal && (
                    <p className="text-[11px] text-secondary mt-xs">
                      Rp {Number(nominal).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                    Batas Waktu
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full px-sm py-sm rounded-lg bg-surface-container border border-outline-variant text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

            </form>
          )}

          {/* ── Hasil Pesan WA ── */}
          {waMessage && (
            <div className="p-md space-y-md">
              <div className="flex items-center gap-sm text-[#6dbf9a]">
                <span className="material-symbols-outlined">check_circle</span>
                <span className="font-label-md text-label-md font-bold">Tagihan berhasil dibuat!</span>
              </div>

              <div>
                <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Template Pesan WhatsApp:</p>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-sm">
                  <pre className="text-on-surface text-[13px] whitespace-pre-wrap font-sans leading-relaxed">
                    {waMessage}
                  </pre>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className={`w-full py-sm rounded-lg font-bold font-label-md text-label-md flex items-center justify-center gap-sm transition-colors ${
                  copied
                    ? 'bg-[#0d2318] text-[#6dbf9a] border border-[#4e8c6e]'
                    : 'bg-primary-container text-on-primary-container hover:opacity-90'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Tersalin!' : 'Copy to Clipboard'}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md"
              >
                Buat Tagihan Lain
              </button>
            </div>
          )}
        </div>

        {/* Footer — hanya tampil saat form belum disubmit */}
        {!waMessage && (
          <div className="p-md border-t border-outline-variant flex justify-end gap-sm bg-surface-container-lowest flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-md py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              form="invoice-form"
              disabled={loading}
              className="px-md py-sm rounded-lg bg-primary-container text-on-primary-container font-bold disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-sm"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              Simpan & Buat Pesan WA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateInvoiceModal;
