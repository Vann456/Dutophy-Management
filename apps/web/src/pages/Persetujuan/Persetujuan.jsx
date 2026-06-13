import { useEffect, useState } from 'react'
import { fetchTransactions, updateTransaction } from '../../api'

export default function Persetujuan({ user }) {
  const currentUsername = user?.username;
  const currentUserRole = (user?.role || '').toLowerCase().trim();
  const canApproveReject = currentUsername === 'dutophy@gmail.com' || currentUserRole === 'ketua' || currentUserRole === 'wakil';
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    loadTransactions()
  }, [])

  async function loadTransactions() {
    setLoading(true)
    try {
      const res = await fetchTransactions()
      setTransactions(res || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id) {
      try {
        await updateTransaction(id, { status: 'Approved' })
        await loadTransactions()
      } catch (err) {
      console.error(err)
      alert('Gagal memperbarui status')
    }
  }

  function handleRejectClick(transaction) {
    setSelectedTransaction(transaction)
    setRejectionReason('')
    setRejectModalOpen(true)
  }

  async function handleRejectSubmit() {
    if (!selectedTransaction || !rejectionReason.trim()) {
      alert('Mohon isi alasan penolakan')
      return
    }
      try {
        await updateTransaction(selectedTransaction.id, { 
          status: 'Rejected',
          rejectionReason: rejectionReason.trim()
        })
        setRejectModalOpen(false)
      setSelectedTransaction(null)
      setRejectionReason('')
      await loadTransactions()
    } catch (err) {
      console.error(err)
      alert('Gagal memperbarui status')
    }
  }

  const pendingTransactions = transactions.filter(t => t.status === 'Pending' || !t.status)
  const waitingCount = pendingTransactions.length
  const approvedToday = transactions.filter(t => t.status === 'Approved').length
  const rejectedToday = transactions.filter(t => t.status === 'Rejected').length

  return (
    <>
      <div>
        <h2 className="font-headline-md text-headline-md text-primary font-bold">Antrean Persetujuan</h2>
        <p className="font-body-md text-[14px] text-on-surface-variant mt-1">Tinjau dan kelola permintaan transaksi yang membutuhkan persetujuan.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <section className="lg:col-span-2 space-y-sm">
          {loading ? (
            <div>Memuat...</div>
          ) : pendingTransactions.length ? (
            pendingTransactions.map((tx) => (
              <article key={tx.id} className="bg-surface-container border border-outline-variant rounded-xl p-md hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${tx.type === 'Pemasukan' ? 'bg-[#0d3b1e] text-[#6dd58c]' : 'bg-[#3b0d0d] text-[#d56d6d]'} flex items-center justify-center shrink-0`}>
                      <span className="material-symbols-outlined">{tx.type === 'Pemasukan' ? 'arrow_downward' : 'arrow_upward'}</span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-label-md text-label-md text-on-surface font-bold text-base">{tx.description}</h3>
                        <span className={`bg-surface-variant text-on-surface-variant font-label-md text-[10px] px-2 py-0.5 rounded-sm ${tx.type === 'Pemasukan' ? 'text-[#6dd58c]' : 'text-[#d56d6d]'}`}>{tx.type}</span>
                      </div>
                      <p className="font-body-md text-[14px] text-on-surface-variant mb-2">Kategori: {tx.category || '—'}</p>
                      <p className="font-body-md text-body-md text-primary font-bold">Rp {Number(tx.amount || 0).toLocaleString('id-ID')}</p>
                      <div className="mt-3 bg-surface-container-high p-3 rounded-lg">
                        <p className="font-body-md text-[14px] text-on-surface-variant">{new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                   {canApproveReject ? (
                     <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                       <button
                         onClick={() => handleApprove(tx.id)}
                         className="flex-1 sm:flex-none font-label-md text-label-md py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors bg-[#0d3b1e] text-[#6dd58c] hover:bg-[#1a5a2e] hover:text-[#8ae6a8]"
                         type="button"
                       >
                         <span className="material-symbols-outlined text-[18px]">check</span>
                         Setujui
                       </button>
                       <button
                         onClick={() => handleRejectClick(tx)}
                         className="flex-1 sm:flex-none font-label-md text-label-md py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors bg-transparent border border-outline text-on-surface hover:bg-surface-container-highest"
                         type="button"
                       >
                         <span className="material-symbols-outlined text-[18px]">close</span>
                         Tolak
                       </button>
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-sm text-on-surface-variant italic">
                       <span className="material-symbols-outlined text-[16px]">info</span>
                       Hanya Ketua & Wakil yang dapat menyetujui
                     </div>
                   )}
                </div>
              </article>
            ))
          ) : (
            <div className="text-center py-8 text-on-surface-variant">Tidak ada transaksi yang menunggu persetujuan</div>
          )}
        </section>

        <aside className="space-y-sm">
          <section className="bg-surface-container border border-outline-variant rounded-xl p-md">
            <h3 className="font-label-md text-label-md text-on-surface font-bold mb-4 uppercase tracking-wider">Ringkasan Persetujuan</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/50">
                <span className="font-body-md text-[14px] text-on-surface-variant">Menunggu Persetujuan</span>
                <span className="font-label-md text-label-md text-on-surface font-bold">{waitingCount} Permintaan</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-outline-variant/50">
                <span className="font-body-md text-[14px] text-on-surface-variant">Disetujui</span>
                <span className="font-label-md text-label-md text-on-surface font-bold text-surface-tint">{approvedToday} Transaksi</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-md text-[14px] text-on-surface-variant">Ditolak</span>
                <span className="font-label-md text-label-md text-on-surface font-bold text-error">{rejectedToday} Transaksi</span>
              </div>
            </div>
          </section>

          <section className="bg-surface-container border border-outline-variant rounded-xl p-md">
            <h3 className="font-label-md text-label-md text-on-surface font-bold mb-4 uppercase tracking-wider">Aktivitas Terakhir</h3>
            <div className="relative pl-4 border-l border-outline-variant space-y-4">
              {/* Activity feed from transactions */}
              {transactions.slice(0,5).map((t) => (
                <div key={t.id} className="relative">
                  <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${t.status === 'Approved' ? 'bg-[#6dd58c]' : t.status === 'Rejected' ? 'bg-[#d56d6d]' : 'bg-[#d5c56d]'} border-2 border-surface-container`}></div>
                  <p className="font-label-md text-label-md text-on-surface">{t.description}</p>
                  <p className="font-body-md text-[12px] text-on-surface-variant">{t.type}</p>
                  <p className="font-body-md text-[10px] text-outline mt-0.5">{t.status || 'Pending'}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Rejection Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-md max-w-md w-full">
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold mb-4">Alasan Penolakan</h3>
            <p className="font-body-md text-[14px] text-on-surface-variant mb-4">
              Mohon berikan alasan penolakan untuk transaksi: <span className="font-semibold text-on-surface">{selectedTransaction?.description}</span>
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Tulis alasan penolakan di sini..."
              className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
              rows={4}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setRejectModalOpen(false)
                  setSelectedTransaction(null)
                  setRejectionReason('')
                }}
                className="font-label-md text-label-md py-2 px-4 rounded-lg border border-outline text-on-surface hover:bg-surface-container-high transition-colors"
                type="button"
              >
                Batal
              </button>
              <button
                onClick={handleRejectSubmit}
                className="font-label-md text-label-md py-2 px-4 rounded-lg bg-[#3b0d0d] text-[#d56d6d] hover:bg-[#5a1a1a] hover:text-[#e58a8a] transition-colors"
                type="button"
              >
                Tolak Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
