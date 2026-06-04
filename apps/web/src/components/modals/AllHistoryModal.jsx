import { useMemo, useState } from 'react'

const historyTypeBadgeConfig = {
  Pemasukan: { icon: 'arrow_downward', className: 'bg-blue-900/40 text-blue-300', prefix: '+' },
  Pengeluaran: { icon: 'arrow_upward', className: 'bg-error-container/30 text-error', prefix: '-' },
}

export default function AllHistoryModal({ isOpen, onClose, transactions = [], historyType = 'Pemasukan' }) {
  const [timeFilter, setTimeFilter] = useState('all')

  /** Parse date robustly — normalizes to local midnight to avoid timezone issues */
  const parseTxDate = (dateValue) => {
    if (!dateValue) return null
    const d = new Date(dateValue)
    if (Number.isNaN(d.getTime())) return null
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  const getFilteredByTime = (txList) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    return txList.filter(tx => {
      const txDay = parseTxDate(tx?.createdAt)
      if (!txDay) return false
      const diffDays = Math.floor((today - txDay) / (1000 * 60 * 60 * 24))
      
      if (timeFilter === 'all') return true
      if (timeFilter === '1_week') return diffDays >= 0 && diffDays < 7
      if (timeFilter === '1_month') return diffDays >= 0 && diffDays < 30
      if (timeFilter === '1_year') return diffDays >= 0 && diffDays < 365
      return true
    })
  }

  const typedTransactions = useMemo(() => {
    const list = Array.isArray(transactions) ? transactions : []
    if (!historyType) return list
    const filtered = list.filter((t) => t?.type === historyType)
    const withTimeFilter = getFilteredByTime(filtered)
    return withTimeFilter.length ? withTimeFilter : []
  }, [transactions, historyType, timeFilter])

  if (!isOpen) return null

  const badge = historyTypeBadgeConfig[historyType] || historyTypeBadgeConfig.Pemasukan

  const rows = [...typedTransactions].sort(
    (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
  )

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        className="w-full max-w-4xl bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-md border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <div>
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
              Riwayat Semua {historyType}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Tutup"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex flex-wrap gap-sm items-center">
          <span className="font-label-md text-label-md text-secondary uppercase tracking-wider">Filter:</span>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-2 rounded-lg font-label-md text-label-md font-semibold transition-colors ${
              timeFilter === 'all'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setTimeFilter('1_week')}
            className={`px-3 py-2 rounded-lg font-label-md text-label-md font-semibold transition-colors ${
              timeFilter === '1_week'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high'
            }`}
          >
            1 Minggu Terakhir
          </button>
          <button
            onClick={() => setTimeFilter('1_month')}
            className={`px-3 py-2 rounded-lg font-label-md text-label-md font-semibold transition-colors ${
              timeFilter === '1_month'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high'
            }`}
          >
            1 Bulan Terakhir
          </button>
          <button
            onClick={() => setTimeFilter('1_year')}
            className={`px-3 py-2 rounded-lg font-label-md text-label-md font-semibold transition-colors ${
              timeFilter === '1_year'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high'
            }`}
          >
            1 Tahun Terakhir
          </button>
        </div>

        <div className="p-md overflow-x-auto">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="py-sm px-md font-label-md text-label-md text-primary uppercase whitespace-nowrap">
                    Tanggal
                  </th>
                  <th className="py-sm px-md font-label-md text-label-md text-primary uppercase whitespace-nowrap">
                    Kategori
                  </th>
                  <th className="py-sm px-md font-label-md text-label-md text-primary uppercase">
                    Keterangan
                  </th>
                  <th className="py-sm px-md font-label-md text-label-md text-primary uppercase whitespace-nowrap">
                    Oleh
                  </th>
                  <th className="py-sm px-md font-label-md text-label-md text-primary uppercase text-right whitespace-nowrap">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {rows.length ? (
                  rows.map((tx, index) => {
                    const createdAt = tx?.createdAt ? new Date(tx.createdAt) : null
                    const amount = Number(tx?.amount || 0)

                    const formattedDate =
                      createdAt && !Number.isNaN(createdAt.getTime())
                        ? createdAt.toLocaleDateString('id-ID')
                        : '—'

                    return (
                      <tr
                        key={tx?.id || `${tx?.createdAt}-${tx?.description}-${amount}-${index}`}
                        className="hover:bg-surface-container-high transition-colors"
                      >
                        <td className="py-sm px-md text-on-surface-variant whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-sm px-md">
                          <span
                            className={`inline-flex items-center gap-xs px-sm py-xs rounded ${badge.className} font-label-md text-label-md font-semibold`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {badge.icon}
                            </span>
                            {historyType}
                          </span>
                        </td>
                        <td className="py-sm px-md font-medium text-on-surface">
                          {tx?.description || '—'}
                        </td>
                        <td className="py-sm px-md whitespace-nowrap">Admin</td>
                        <td className="py-sm px-md text-right whitespace-nowrap font-semibold text-[14px]">
                          <span
                            className={
                              historyType === 'Pemasukan' ? 'text-green-400' : 'text-error'
                            }
                          >
                            {badge.prefix} Rp {amount.toLocaleString('id-ID')}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-center">
                      <div className="mx-auto max-w-2xl rounded-3xl border border-outline-variant bg-surface p-8">
                        <p className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">
                          Tidak ada transaksi
                        </p>
                        <p className="font-body-md text-body-md text-on-surface-variant">
                          Belum ada data riwayat keuangan yang dapat ditampilkan.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}