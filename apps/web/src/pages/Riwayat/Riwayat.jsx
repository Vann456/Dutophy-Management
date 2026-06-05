import { useMemo, useState, useEffect, useCallback } from 'react'
import { fetchTransactions, updateTransaction } from '../../api'

const ROWS_PER_PAGE = 6

const months = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

// Helper function to generate array of years from past to future
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear - 3; i <= currentYear + 3; i++) {
    years.push(i)
  }
  return years
}

export default function Riwayat() {
  const currentMonthName = months[new Date().getMonth()]
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const yearOptions = generateYearOptions()

  const [transactions, setTransactions] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [editForm, setEditForm] = useState({ description: '', amount: '', category: '' })
  const [currentPage, setCurrentPage] = useState(1)
  
  useEffect(() => {
    loadTransactions()
  }, [refreshKey])

  useEffect(() => {
    const inc = () => setRefreshKey(prev => prev + 1)
    window.addEventListener('transactions:updated', inc)
    return () => {
      window.removeEventListener('transactions:updated', inc)
    }
  }, [])

  // Reset to page 1 when month or year filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedMonth, selectedYear])

  const loadTransactions = async () => {
    try {
      const data = await fetchTransactions()
      setTransactions(data || [])
    } catch (err) {
      console.error('Gagal memuat transaksi', err)
    }
  }

  // Helper function to extract month and year from date string (ISO format: YYYY-MM-DD)
  const getMonthAndYearFromDate = (dateStr) => {
    if (!dateStr) return { month: null, year: null }
    const date = new Date(dateStr)
    const monthIndex = date.getMonth()
    const year = date.getFullYear()
    return { month: months[monthIndex], year }
  }

  const displayRows = useMemo(() => {
    return transactions.map(t => {
      const date = new Date(t.createdAt);
      const status = t.status || 'Pending';
      let statusClass = 'bg-[#3d3b0d] text-[#d5c56d]'; // Default Pending (Soft Yellow)
      if (status === 'Approved') statusClass = 'bg-[#0d3b1e] text-[#6dd58c]'; // Soft Green
      if (status === 'Rejected') statusClass = 'bg-[#3b0d0d] text-[#d56d6d]'; // Soft Red
      
      return {
        ...t,
        date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
        status,
        statusClass,
        amountFormatted: t.type === 'Pemasukan' ? `+ Rp ${(t.amount || 0).toLocaleString('id-ID')}` : `- Rp ${(t.amount || 0).toLocaleString('id-ID')}`
      }
    }).filter((row) => {
      const { month, year } = getMonthAndYearFromDate(row.createdAt)
      return month === selectedMonth && year === selectedYear
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [transactions, selectedMonth, selectedYear])

  const totalPages = useMemo(() => Math.ceil(displayRows.length / ROWS_PER_PAGE), [displayRows.length])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return displayRows.slice(start, start + ROWS_PER_PAGE)
  }, [displayRows, currentPage])

  // Clamp currentPage if totalPages changes (e.g. after filter)
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const goToPage = useCallback((page) => {
    setCurrentPage(page)
  }, [])

  const goToPrev = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }, [totalPages])

  // Generate visible page numbers (with ellipsis logic for many pages)
  const visiblePageNumbers = useMemo(() => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }, [totalPages, currentPage])

  const handleEditClick = (transaction) => {
    setSelectedTransaction(transaction)
    setEditForm({
      description: transaction.description || '',
      amount: transaction.amount || '',
      category: transaction.category || ''
    })
    setEditModalOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!selectedTransaction) return
    try {
      await updateTransaction(selectedTransaction.id, {
        description: editForm.description,
        amount: Number(editForm.amount),
        category: editForm.category,
        status: 'Pending' // Reset to Pending when edited
      })
      setEditModalOpen(false)
      setSelectedTransaction(null)
      setEditForm({ description: '', amount: '', category: '' })
      await loadTransactions()
    } catch (err) {
      console.error('Gagal mengupdate transaksi', err)
      alert('Gagal mengupdate transaksi')
    }
  }

  const handleExportCsv = () => {
    const header = ['Tanggal', 'Deskripsi', 'Kategori', 'Jumlah', 'Verifikasi']
    const csvRows = [
      header,
      ...displayRows.map((row) => [row.date, row.description, row.type, row.amountFormatted, row.status]),
    ]
    const csvContent = csvRows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `riwayat-keuangan-${selectedMonth}-${selectedYear}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => window.print()

  return (
    <>
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-xs overflow-x-auto shadow-sm no-print">
        <ul className="flex min-w-max gap-xs">
          {months.map((month) => {
            const isActive = month === selectedMonth
            return (
              <li key={month}>
                <button
                  className={`px-md py-sm rounded-lg font-label-md text-label-md transition-colors ${
                    isActive
                      ? 'font-bold bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                  type="button"
                  onClick={() => setSelectedMonth(month)}
                >
                  {month}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
        <div className="p-md border-b border-outline-variant flex flex-col sm:flex-row sm:justify-between sm:items-start gap-md bg-surface-container-low no-print">
          <div className="flex-1">
            <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">Riwayat Transaksi - {selectedMonth} {selectedYear}</h3>
            <p className="font-body-md text-[14px] text-on-surface-variant mt-xs">Menampilkan semua pergerakan dana untuk bulan dan tahun terpilih.</p>
          </div>
          <div className="flex items-center gap-sm">
            <label className="font-label-md text-label-md text-on-surface-variant whitespace-nowrap" htmlFor="year-select">
              Tahun:
            </label>
            <select
              className="bg-surface-container text-on-surface border border-outline-variant rounded-lg font-label-md text-label-md px-sm py-1 focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer transition-colors hover:bg-surface-container-high"
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-sm items-center">
            <button
              className="p-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center"
              type="button"
              onClick={handlePrint}
            >
              <span className="material-symbols-outlined text-[20px]">print</span>
            </button>
            <button
              className="p-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors flex items-center justify-center gap-2 px-3"
              type="button"
              onClick={handleExportCsv}
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              <span className="font-label-md text-label-md">Ekspor CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline-variant">
                <th className="p-sm md:p-md font-label-md text-label-md text-primary font-bold whitespace-nowrap">Tanggal</th>
                <th className="p-sm md:p-md font-label-md text-label-md text-primary font-bold">Deskripsi</th>
                <th className="p-sm md:p-md font-label-md text-label-md text-primary font-bold whitespace-nowrap">Kategori</th>
                <th className="p-sm md:p-md font-label-md text-label-md text-primary font-bold text-right whitespace-nowrap">Jumlah</th>
                <th className="p-sm md:p-md font-label-md text-label-md text-primary font-bold text-center whitespace-nowrap">Verifikasi</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-[14px] text-on-surface divide-y divide-outline-variant/50" style={{ minHeight: `${ROWS_PER_PAGE * 52}px` }}>
              {paginatedRows.length ? paginatedRows.map((row) => {
                const isIncome = row.type === 'Pemasukan'
                return (
                  <tr key={row.id} className="hover:bg-surface-container-highest transition-colors duration-150">
                    <td className="p-sm md:p-md whitespace-nowrap text-on-surface-variant">{row.date}</td>
                    <td className="p-sm md:p-md font-medium">{row.description}</td>
                    <td className="p-sm md:p-md whitespace-nowrap">
                      <div className={`flex items-center gap-xs ${isIncome ? 'text-primary' : 'text-error'}`}>
                        <span className="material-symbols-outlined text-[16px]">
                          {isIncome ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                        {row.type}
                      </div>
                    </td>
                    <td className={`p-sm md:p-md text-right font-medium whitespace-nowrap ${isIncome ? 'text-primary' : 'text-error'}`}>
                      {row.amountFormatted}
                    </td>
                    <td className="p-sm md:p-md text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md ${row.statusClass} font-label-md text-[10px]`}>
                          {row.status}
                        </span>
                        {row.status === 'Rejected' && row.rejectionReason && (
                          <span className="text-[9px] text-[#d56d6d] italic max-w-[150px] text-center">
                            {row.rejectionReason}
                          </span>
                        )}
                        {row.status === 'Rejected' && (
                          <button
                            onClick={() => handleEditClick(row)}
                            className="text-[10px] text-primary hover:underline mt-1"
                            type="button"
                          >
                            Edit/Revisi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan="5" className="p-10 text-center">
                    <div className="mx-auto max-w-2xl rounded-3xl border border-outline-variant bg-surface p-8">
                      <p className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-3">Belum ada rekaman transaksi kas saat ini.</p>
                      <p className="font-body-md text-body-md text-on-surface-variant">Silakan tambahkan transaksi melalui tombol Tambah Transaksi di sidebar untuk mulai mengisi riwayat.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-sm border-t border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
          <span className="font-body-md text-[14px] text-on-surface-variant pl-sm">
            Menampilkan {displayRows.length > 0 ? (currentPage - 1) * ROWS_PER_PAGE + 1 : 0}–{Math.min(currentPage * ROWS_PER_PAGE, displayRows.length)} dari {displayRows.length} transaksi untuk {selectedMonth} {selectedYear}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrev}
                disabled={currentPage === 1}
                className="p-1 text-on-surface hover:bg-surface-container rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                type="button"
                aria-label="Halaman sebelumnya"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              {visiblePageNumbers.map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-on-surface-variant text-sm select-none">…</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded font-label-md text-sm transition-colors ${
                      page === currentPage
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface hover:bg-surface-container'
                    }`}
                    type="button"
                    aria-label={`Halaman ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={goToNext}
                disabled={currentPage === totalPages}
                className="p-1 text-on-surface hover:bg-surface-container rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                type="button"
                aria-label="Halaman berikutnya"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Edit/Revise Modal for Rejected Transactions */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-md max-w-md w-full">
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold mb-4">Edit/Revisi Transaksi</h3>
            <div className="space-y-4">
              <div>
                <label className="font-label-md text-label-md text-on-surface-variant block mb-2">Deskripsi</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="font-label-md text-label-md text-on-surface-variant block mb-2">Nominal</label>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="font-label-md text-label-md text-on-surface-variant block mb-2">Kategori</label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setEditModalOpen(false)
                  setSelectedTransaction(null)
                  setEditForm({ description: '', amount: '', category: '' })
                }}
                className="font-label-md text-label-md py-2 px-4 rounded-lg border border-outline text-on-surface hover:bg-surface-container-high transition-colors"
                type="button"
              >
                Batal
              </button>
              <button
                onClick={handleEditSubmit}
                className="font-label-md text-label-md py-2 px-4 rounded-lg bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors"
                type="button"
              >
                Simpan & Ajukan Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
