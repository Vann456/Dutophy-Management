import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { fetchTransactions } from '../api'

// ─── helpers ────────────────────────────────────────────────────────────────

const DAY_NAMES   = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                     'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const ROWS_PER_PAGE = 10

/**
 * Format angka ke label ringkas untuk sumbu Y.
 * Contoh: 100000 → "Rp 100k" | 1500000 → "Rp 1.500k" | 0 → "0"
 */
const formatYAxis = (val) => {
  if (val === 0) return '0'
  if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}k`
  return `Rp ${val}`
}

/** Format nominal lengkap standar Indonesia untuk tooltip */
const formatTooltipIDR = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)

/** Tooltip kustom — tampilkan nominal asli lengkap */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-inverse-surface text-inverse-on-surface text-[11px] py-1 px-2 rounded shadow">
      <p className="font-semibold">{label}</p>
      <p>{formatTooltipIDR(payload[0].value)}</p>
    </div>
  )
}

// ─── filter waktu untuk grafik & kartu ringkasan ────────────────────────────

const filterByTime = (txList, filter) => {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return txList.filter(tx => {
    if (!tx?.createdAt) return false
    const txDay = new Date(new Date(tx.createdAt).setHours(0, 0, 0, 0))
    const diff  = Math.floor((today - txDay) / (1000 * 60 * 60 * 24))
    if (filter === '1_week')  return diff >= 0 && diff < 7
    if (filter === '1_month') {
      const d = new Date(tx.createdAt)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }
    if (filter === '1_year') return new Date(tx.createdAt).getFullYear() === now.getFullYear()
    return true
  })
}

const FILTER_LABEL = {
  '1_week':  'Minggu Ini',
  '1_month': 'Bulan Ini',
  '1_year':  'Tahun Ini',
}

/**
 * Kelompokkan transaksi sesuai filter untuk grafik.
 * Filter '1_week'  → 7 hari terakhir, sumbu X = nama hari
 * Filter '1_month' → hari-hari bulan berjalan, sumbu X = tanggal (1-31)
 * Filter '1_year'  → 12 bulan tahun berjalan, sumbu X = nama bulan
 */
const buildChartData = (transactions, filter) => {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (filter === '1_week') {
    const slots = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (6 - i))
      return { name: DAY_NAMES[d.getDay()], date: d, total: 0 }
    })
    transactions.forEach(t => {
      if (!t?.createdAt) return
      const txDay = new Date(new Date(t.createdAt).setHours(0, 0, 0, 0))
      const slot  = slots.find(s => s.date.getTime() === txDay.getTime())
      if (slot) slot.total += t.amount || 0
    })
    return slots.map(s => ({ name: s.name, total: s.total }))
  }

  if (filter === '1_month') {
    const year  = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const slots = Array.from({ length: daysInMonth }, (_, i) => ({
      name: String(i + 1),
      date: new Date(year, month, i + 1),
      total: 0
    }))
    transactions.forEach(t => {
      if (!t?.createdAt) return
      const d = new Date(t.createdAt)
      if (d.getFullYear() === year && d.getMonth() === month) {
        slots[d.getDate() - 1].total += t.amount || 0
      }
    })
    return slots.map(s => ({ name: s.name, total: s.total }))
  }

  if (filter === '1_year') {
    const year  = now.getFullYear()
    const slots = MONTH_NAMES.map((name, i) => ({ name, month: i, total: 0 }))
    transactions.forEach(t => {
      if (!t?.createdAt) return
      const d = new Date(t.createdAt)
      if (d.getFullYear() === year) {
        slots[d.getMonth()].total += t.amount || 0
      }
    })
    return slots.map(s => ({ name: s.name, total: s.total }))
  }

  return []
}

// ─── Rolling time filter helpers untuk "Lihat Semua" view ──────────────────

const ROLLING_FILTER_LABELS = {
  'all':     'Semua',
  '1_week':  '1 Minggu Terakhir',
  '1_month': '1 Bulan Terakhir',
  '1_year':  '1 Tahun Terakhir',
}

/**
 * Filter transactions for a specific date range (rolling window).
 * Returns transactions within the date range.
 */
const filterByDateRange = (txList, startDate, endDate) => {
  return txList.filter(tx => {
    if (!tx?.createdAt) return false
    const txDate = new Date(tx.createdAt)
    return txDate >= startDate && txDate < endDate
  })
}

/**
 * Calculate the percentage growth between current and previous periods.
 * Handles edge cases like division by zero.
 */
const calculateGrowthPercentage = (currentTotal, previousTotal) => {
  if (previousTotal === 0) {
    if (currentTotal > 0) return 100
    return 0
  }
  return ((currentTotal - previousTotal) / previousTotal) * 100
}

/**
 * Format growth percentage with sign and clean formatting.
 */
const formatGrowthPercentage = (percentage) => {
  const rounded = Math.round(percentage)
  if (rounded > 0) return `+${rounded}%`
  return `${rounded}%`
}

/**
 * Get comparison label based on time filter.
 */
const getComparisonLabel = (filter) => {
  switch (filter) {
    case '1_week': return 'minggu lalu'
    case '1_month': return 'bulan lalu'
    case '1_year': return 'tahun lalu'
    default: return 'periode lalu'
  }
}

/**
 * Parse date robustly — handles ISO strings, Date objects, etc.
 * Normalizes to local midnight to avoid timezone offset issues.
 */
const parseTransactionDate = (dateValue) => {
  if (!dateValue) return null
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return null
  // Normalize to local midnight to prevent timezone-related data loss
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Filter transactions using rolling window (NOT calendar-based).
 * 1 Week  = today − 7 days
 * 1 Month = today − 30 days
 * 1 Year  = today − 365 days
 */
const filterByRollingTime = (txList, filter) => {
  if (filter === 'all') return txList
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return txList.filter(tx => {
    const txDay = parseTransactionDate(tx?.createdAt)
    if (!txDay) return false
    const diff = Math.floor((today - txDay) / (1000 * 60 * 60 * 24))
    if (filter === '1_week')  return diff >= 0 && diff < 7
    if (filter === '1_month') return diff >= 0 && diff < 30
    if (filter === '1_year')  return diff >= 0 && diff < 365
    return true
  })
}

// ─── komponen utama ──────────────────────────────────────────────────────────

export default function Pengeluaran({ onOpenAddTransaction }) {
  const [transactions, setTransactions]             = useState([])
  const [error, setError]                           = useState(null)
  const [refreshKey, setRefreshKey]                 = useState(0)
  const [timeFilter, setTimeFilter]                 = useState('1_week')
  const [showAll, setShowAll]                       = useState(false)
  const [allTimeFilter, setAllTimeFilter]           = useState('all')

  useEffect(() => { loadTransactions() }, [refreshKey])

  useEffect(() => {
    const inc = () => setRefreshKey(prev => prev + 1)
    window.addEventListener('transactions:updated', inc)
    window.addEventListener('pengeluaran:updated', inc)
    return () => {
      window.removeEventListener('transactions:updated', inc)
      window.removeEventListener('pengeluaran:updated', inc)
    }
  }, [])

  const loadTransactions = async () => {
    try {
      const data = await fetchTransactions()
      const safeData = data || []
      setTransactions(safeData.filter(t => t.type === 'Pengeluaran'))
    } catch (err) {
      console.error(err)
      setError('Gagal memuat transaksi')
    }
  }

  // Only include Approved transactions in calculations
  const approvedTransactions = transactions.filter(t => t.status === 'Approved')
  
  // Data grafik berubah sesuai dropdown
  const chartData = buildChartData(approvedTransactions, timeFilter)

  // Nilai maksimal data grafik — fallback 100.000 jika semua nol
  const chartMax = Math.max(...chartData.map(d => d.total), 0)
  const yDomain  = [0, chartMax > 0 ? 'auto' : 100_000]

  // Transaksi yang sudah disaring sesuai filter waktu (untuk card ringkasan)
  const filteredTx     = filterByTime(approvedTransactions, timeFilter)
  const totalExpense   = filteredTx.reduce((sum, t) => sum + (t.amount || 0), 0)
  const cardTitle      = `Total Pengeluaran ${FILTER_LABEL[timeFilter] ?? ''}`

  // Calculate growth percentage based on time filter
  const growthData = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let currentStart
    let currentEnd
    let previousStart
    let previousEnd

    if (timeFilter === '1_week') {
      // Current: Last 7 days, Previous: 7 days before that
      currentEnd = new Date(today)
      currentEnd.setDate(currentEnd.getDate() + 1) // Include today
      currentStart = new Date(currentEnd)
      currentStart.setDate(currentStart.getDate() - 7)
      previousEnd = new Date(currentStart)
      previousStart = new Date(previousEnd)
      previousStart.setDate(previousStart.getDate() - 7)
    } else if (timeFilter === '1_month') {
      // Current: Last 30 days, Previous: 30 days before that
      currentEnd = new Date(today)
      currentEnd.setDate(currentEnd.getDate() + 1) // Include today
      currentStart = new Date(currentEnd)
      currentStart.setDate(currentStart.getDate() - 30)
      previousEnd = new Date(currentStart)
      previousStart = new Date(previousEnd)
      previousStart.setDate(previousStart.getDate() - 30)
    } else if (timeFilter === '1_year') {
      // Current: Jan 1 to today, Previous: Same period last year
      currentStart = new Date(now.getFullYear(), 0, 1)
      currentEnd = new Date(today)
      currentEnd.setDate(currentEnd.getDate() + 1) // Include today
      previousStart = new Date(now.getFullYear() - 1, 0, 1)
      previousEnd = new Date(now.getFullYear() - 1, today.getMonth(), today.getDate() + 1)
    } else {
      return { percentage: 0, label: 'periode lalu' }
    }

    const currentTotal = filterByDateRange(approvedTransactions, currentStart, currentEnd)
      .reduce((sum, t) => sum + (t.amount || 0), 0)
    const previousTotal = filterByDateRange(approvedTransactions, previousStart, previousEnd)
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    const percentage = calculateGrowthPercentage(currentTotal, previousTotal)
    const label = getComparisonLabel(timeFilter)

    return { percentage, label }
  }, [approvedTransactions, timeFilter])

  const growthPercentage = formatGrowthPercentage(growthData.percentage)
  const isPositiveGrowth = growthData.percentage >= 0

  // Filter for approved transactions first, then sort by date descending (newest first)
  const approvedAndSortedTransactions = [...transactions]
    .filter(t => t.status === 'Approved')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // Top 10 for summary view (only approved, sorted descending)
  const top10Rows = approvedAndSortedTransactions.slice(0, ROWS_PER_PAGE)

  // All approved transactions filtered by rolling time for expanded view
  const allFilteredRows = useMemo(
    () => filterByRollingTime(approvedAndSortedTransactions, allTimeFilter),
    [approvedAndSortedTransactions, allTimeFilter]
  )

  // Reset expanded view filters when closing
  const handleToggleView = () => {
    if (showAll) {
      setAllTimeFilter('all')
    }
    setShowAll(!showAll)
  }

  return (
    <>
      {/* ── Judul ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-error">
            Laporan Pengeluaran
          </h1>
          <p className="font-body-md text-body-md text-secondary mt-xs">
            Ringkasan dana keluar untuk keperluan produksi dan operasional.
          </p>
        </div>
      </div>

      {/* ── Grafik + Kartu total ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-sm mb-md">
            <h3 className="font-headline-md text-headline-md font-bold text-error">Grafik Pengeluaran</h3>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="bg-surface border border-outline-variant rounded-lg text-sm py-2 px-3 text-secondary focus:ring-primary focus:border-primary"
            >
              <option value="1_week">1 Minggu Terakhir</option>
              <option value="1_month">1 Bulan Terakhir</option>
              <option value="1_year">1 Tahun Terakhir</option>
            </select>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant, #aaa)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={yDomain}
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant, #aaa)' }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#ffb4ab"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#ffb4ab' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kartu total */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm flex flex-col justify-center">
          <span className="font-label-md text-label-md text-secondary mb-xs flex items-center gap-xs uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            {cardTitle}
          </span>
          <h2 className="font-display-lg text-display-lg text-error">
            Rp {totalExpense.toLocaleString('id-ID')}
          </h2>
          <div className="mt-md flex items-center gap-sm">
            <span className={`${isPositiveGrowth ? 'bg-error-container text-on-error-container' : 'bg-green-900/40 text-green-400'} font-label-md text-label-md px-2 py-1 rounded flex items-center gap-1`}>
              <span className="material-symbols-outlined text-[14px]">
                {isPositiveGrowth ? 'arrow_upward' : 'arrow_downward'}
              </span>
              {growthPercentage}
            </span>
            <span className="font-body-md text-[14px] text-secondary">vs {growthData.label}</span>
          </div>
        </div>
      </div>

      {/* ── Tabel detail: Top 10 summary OR expanded "Lihat Semua" view ── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        {/* Header with toggle button */}
        <div className="p-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md font-bold text-error">
            {showAll ? 'Semua Pengeluaran' : 'Detail Pengeluaran — 10 Terbaru'}
          </h3>
          <button
            type="button"
            onClick={handleToggleView}
            className="bg-surface text-on-surface border border-outline-variant font-label-md text-label-md py-2 px-3 rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-center gap-xs font-bold"
          >
            {showAll ? (
              <>
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Kembali
              </>
            ) : (
              <>
                Lihat Semua
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>

        {/* Timeframe filter tabs — only visible in expanded view */}
        {showAll && (
          <div className="px-md py-sm border-b border-outline-variant bg-surface-container-lowest flex flex-wrap gap-sm items-center">
            <span className="font-label-md text-label-md text-secondary uppercase tracking-wider mr-1">Filter:</span>
            {Object.entries(ROLLING_FILTER_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAllTimeFilter(key)}
                className={`px-3 py-1.5 rounded-lg font-label-md text-label-md font-semibold transition-colors ${
                  allTimeFilter === key
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="font-body-md text-[13px] text-on-surface-variant ml-auto">
              {allFilteredRows.length} transaksi
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest border-b border-outline-variant">
                <th className="py-sm px-md font-label-md text-label-md text-primary uppercase tracking-wider">Tanggal</th>
                <th className="py-sm px-md font-label-md text-label-md text-primary uppercase tracking-wider">Kategori</th>
                <th className="py-sm px-md font-label-md text-label-md text-primary uppercase tracking-wider">Deskripsi</th>
                <th className="py-sm px-md font-label-md text-label-md text-primary uppercase tracking-wider">Oleh</th>
                <th className="py-sm px-md font-label-md text-label-md text-primary uppercase tracking-wider text-right">Nominal</th>
              </tr>
            </thead>
            <tbody
              className="font-body-md text-[14px] text-on-surface divide-y divide-outline-variant/50"
              style={{ minHeight: `${ROWS_PER_PAGE * 52}px` }}
            >
              {(showAll ? allFilteredRows : top10Rows).length ? (
                (showAll ? allFilteredRows : top10Rows).map((tx) => {
                  const createdAt = tx?.createdAt ? new Date(tx.createdAt) : null
                  const formattedDate = createdAt && !Number.isNaN(createdAt.getTime())
                    ? createdAt.toLocaleDateString('id-ID')
                    : '—'
                  return (
                    <tr key={tx.id} className="hover:bg-surface-container-low transition-colors group cursor-pointer">
                      <td className="py-sm px-md text-secondary">{formattedDate}</td>
                      <td className="py-sm px-md">
                        <span className="inline-flex items-center gap-xs bg-error-container/30 text-error px-2 py-1 rounded text-xs font-semibold">
                          <span className="material-symbols-outlined text-[16px]">payments</span>
                          Pengeluaran
                        </span>
                      </td>
                      <td className="py-sm px-md font-medium group-hover:text-error transition-colors">{tx.description}</td>
                      <td className="py-sm px-md">Admin</td>
                      <td className="py-sm px-md text-right font-semibold text-error">
                        Rp {(tx.amount || 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-sm px-md text-center">
                    <div className="mx-auto max-w-xl rounded-3xl border border-outline-variant bg-surface p-6">
                      <p className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">
                        Belum ada rekaman transaksi kas saat ini.
                      </p>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        Tambahkan transaksi lewat tombol Tambah Transaksi di sidebar untuk memulai pencatatan pengeluaran.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}