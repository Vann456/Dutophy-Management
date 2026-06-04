import { useEffect, useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart,
  CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { fetchTransactions } from '../../api'
import { MONTHS, YEARS, useAnggota } from '../../lib/AnggotaContext'

// ─── PALET WARNA ─────────────────────────────────────────────────────────────
// income  = var(--color-primary) — identik dengan garis di Pemasukan.jsx
// expense = var(--color-error) dengan opacity lebih rendah — identik Pengeluaran.jsx tapi lebih soft

const COLOR = {
  income:  '#b3c5ff',                          // Match text-primary (Laporan Pemasukan)
  expense: '#ffb4ab',                          // Match text-error (Laporan Pengeluaran)
  lunas:   '#4e8c6e',                          // Emerald Muted
  nunggak: '#8c4e5a',                          // Maroon Pastel
  // Bar chart kehadiran — pastel serasi Navy Blue
  hadir:   '#5b8fa8',   // Soft Steel Blue
  alpha:   '#8a5b6e',   // Muted Mauve
  sakit:   '#8a7a4a',   // Soft Khaki Amber
  izin:    '#4a6e8a',   // Deep Slate Blue
}

// ─── FORMAT HELPERS ──────────────────────────────────────────────────────────

const fmtRupiah = (val) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}jt`
  if (val >= 1_000)     return `${(val / 1_000).toFixed(0)}k`
  return `${val}`
}

// ─── CUSTOM TOOLTIP CASHFLOW ─────────────────────────────────────────────────

const CashFlowTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 shadow-xl text-[12px]">
      <p className="font-semibold text-on-surface mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: Rp {Number(p.value).toLocaleString('id-ID')}
        </p>
      ))}
    </div>
  )
}

// ─── CUSTOM TOOLTIP PIECHART ─────────────────────────────────────────────────

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value, payload: p } = payload[0]
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 shadow-xl text-[12px]">
      <p className="font-semibold text-on-surface">{name}</p>
      <p className="text-secondary">{value} orang ({p.pct}%)</p>
    </div>
  )
}

// ─── CUSTOM LABEL PIECHART ───────────────────────────────────────────────────

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }) => {
  if (pct < 5) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={12} fontWeight="bold">
      {pct}%
    </text>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function Statistik() {
  const [transactions, setTransactions] = useState([])
  const [txLoading, setTxLoading]       = useState(true)

  const { getKasStats, getHadirStats } = useAnggota()

  // Filter periode — independen dari filter halaman Anggota
  const now = new Date()
  const [statMonth, setStatMonth] = useState(now.getMonth())
  const [statYear,  setStatYear]  = useState(now.getFullYear())

  // Load transaksi
  useEffect(() => {
    async function load() {
      setTxLoading(true)
      try {
        const txs = await fetchTransactions()
        setTransactions(txs || [])
      } catch (e) {
        console.error(e)
      } finally {
        setTxLoading(false)
      }
    }
    load()
    // Re-load saat ada update transaksi dari halaman lain
    const handler = () => load()
    window.addEventListener('transactions:updated', handler)
    return () => window.removeEventListener('transactions:updated', handler)
  }, [])

  // ─── Cash Flow: Jan–Des tahun aktif ────────────────────────────────────────

  const cashFlowData = useMemo(() => {
    return MONTHS.map((name, monthIdx) => {
      let income = 0, expense = 0
      transactions.forEach(tx => {
        const d = new Date(tx.createdAt)
        if (isNaN(d.getTime())) return
        if (d.getFullYear() !== statYear || d.getMonth() !== monthIdx) return
        if (tx.type === 'Pemasukan')   income  += Number(tx.amount || 0)
        if (tx.type === 'Pengeluaran') expense += Number(tx.amount || 0)
      })
      return { name: name.slice(0, 3), income, expense }
    })
  }, [transactions, statYear])

  // ─── Kas Stats ─────────────────────────────────────────────────────────────

  const kasStats = useMemo(() => {
    const { lunas, nunggak, total } = getKasStats(statYear, statMonth)
    const safe = total || 1
    return {
      total,
      lunas,   lunasPercent:   Math.round((lunas   / safe) * 100),
      nunggak, nunggakPercent: Math.round((nunggak / safe) * 100),
      pieData: [
        { name: 'Lunas',   value: lunas,   pct: Math.round((lunas   / safe) * 100), fill: COLOR.lunas   },
        { name: 'Nunggak', value: nunggak, pct: Math.round((nunggak / safe) * 100), fill: COLOR.nunggak },
      ],
    }
  }, [getKasStats, statYear, statMonth])

  // ─── Hadir Stats ───────────────────────────────────────────────────────────

  const hadirStats = useMemo(() => {
    const { hadir, alpha, sakit, izin, total } = getHadirStats(statYear, statMonth)
    const safe = total || 1
    const rows = [
      { name: 'Hadir', value: hadir, pct: Math.round((hadir / safe) * 100), fill: COLOR.hadir },
      { name: 'Alpha', value: alpha, pct: Math.round((alpha / safe) * 100), fill: COLOR.alpha },
      { name: 'Sakit', value: sakit, pct: Math.round((sakit / safe) * 100), fill: COLOR.sakit },
      { name: 'Izin',  value: izin,  pct: Math.round((izin  / safe) * 100), fill: COLOR.izin  },
    ]
    return { rows, total }
  }, [getHadirStats, statYear, statMonth])

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Judul */}
      <div>
        <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-2">
          Tinjauan Statistik
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Analisis visual data keuangan dan keanggotaan Dutophy.
        </p>
      </div>

      {/* Filter Periode */}
      <div className="flex flex-wrap items-center gap-md bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
        <span className="font-label-md text-label-md text-secondary">Periode Statistik:</span>
        <select
          value={statMonth}
          onChange={e => setStatMonth(Number(e.target.value))}
          className="px-md py-sm bg-surface border border-outline-variant rounded-lg text-on-surface focus:border-primary font-body-md text-[14px]"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={statYear}
          onChange={e => setStatYear(Number(e.target.value))}
          className="px-md py-sm bg-surface border border-outline-variant rounded-lg text-on-surface focus:border-primary font-body-md text-[14px]"
        >
          {YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span className="font-body-md text-[12px] text-secondary ml-auto">
          Data anggota diambil dari Global State secara real-time
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">

        {/* ── Area Chart Cash Flow ── */}
        <section className="bg-surface-container-low rounded-xl border border-outline-variant p-md col-span-1 lg:col-span-2 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-sm mb-md">
            <div>
              <h3 className="font-headline-md text-headline-md text-primary">Grafik Cash Flow</h3>
              <p className="font-body-md text-[12px] text-secondary mt-xs">
                Pemasukan vs Pengeluaran — {statYear}
              </p>
            </div>
            <div className="flex gap-md">
              <span className="inline-flex items-center gap-xs font-label-md text-label-md text-secondary">
                <span className="w-3 h-1 rounded-full inline-block" style={{ background: COLOR.income }}></span>
                Pemasukan
              </span>
              <span className="inline-flex items-center gap-xs font-label-md text-label-md text-secondary">
                <span className="w-3 h-1 rounded-full inline-block" style={{ background: COLOR.expense }}></span>
                Pengeluaran
              </span>
            </div>
          </div>

          {txLoading ? (
            <div className="h-64 flex items-center justify-center text-secondary">Memuat...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={cashFlowData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLOR.income}  stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLOR.income}  stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLOR.expense} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLOR.expense} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#8899aa' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtRupiah}
                  tick={{ fontSize: 11, fill: '#8899aa' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<CashFlowTooltip />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Pemasukan"
                  stroke={COLOR.income}
                  strokeWidth={2}
                  fill="url(#gradIncome)"
                  dot={{ r: 3, fill: COLOR.income, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Pengeluaran"
                  stroke={COLOR.expense}
                  strokeWidth={2}
                  fill="url(#gradExpense)"
                  dot={{ r: 3, fill: COLOR.expense, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>

        {/* ── PieChart Kas ── */}
        <section className="bg-surface-container-low rounded-xl border border-outline-variant p-md col-span-1 shadow-sm flex flex-col">
          <h3 className="font-headline-md text-headline-md text-primary mb-xs">
            Pembayaran Kas
          </h3>
          <p className="font-body-md text-[12px] text-secondary mb-md">
            {MONTHS[statMonth]} {statYear} · {kasStats.total} anggota
          </p>

          <div className="flex-1 flex items-center justify-center min-h-[180px]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={kasStats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={renderPieLabel}
                >
                  {kasStats.pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend + angka */}
          <div className="grid grid-cols-2 gap-2 mt-sm">
            {kasStats.pieData.map(item => (
              <div key={item.name} className="bg-surface-container rounded-lg border border-outline-variant p-sm text-center">
                <div className="flex items-center justify-center gap-xs mb-xs">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: item.fill }}></span>
                  <span className="font-label-md text-label-md text-secondary">{item.name}</span>
                </div>
                <p className="font-headline-md text-headline-md font-bold" style={{ color: item.fill }}>
                  {item.pct}%
                </p>
                <p className="text-secondary text-[11px] mt-xs">{item.value} dari {kasStats.total}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bar Chart Kehadiran ── */}
        <section className="bg-surface-container-low rounded-xl border border-outline-variant p-md col-span-1 md:col-span-2 lg:col-span-3 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-sm mb-md">
            <div>
              <h3 className="font-headline-md text-headline-md text-primary">Kehadiran Anggota</h3>
              <p className="font-body-md text-[12px] text-secondary mt-xs">
                {MONTHS[statMonth]} {statYear} · akumulasi 4 minggu · tanda "-" diabaikan dari pembagi
              </p>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-sm">
              {hadirStats.rows.map(item => (
                <span key={item.name} className="inline-flex items-center gap-xs font-label-md text-label-md text-secondary">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: item.fill }}></span>
                  {item.name}
                </span>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={hadirStats.rows}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#8899aa' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#8899aa' }}
                axisLine={false}
                tickLine={false}
                width={32}
                tickFormatter={v => `${v}`}
              />
              <Tooltip
                cursor={false}
                wrapperStyle={{ outline: 'none' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 shadow-xl text-[12px]">
                      <p className="font-semibold text-on-surface">{label}</p>
                      <p className="text-secondary">{d.value} sesi · {d.pct}%</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="default">
                {hadirStats.rows.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Breakdown angka di bawah chart */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm mt-md">
            {hadirStats.rows.map(item => (
              <div key={item.name} className="bg-surface-container rounded-lg border border-outline-variant p-sm text-center">
                <div className="flex items-center justify-center gap-xs mb-xs">
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: item.fill }}></span>
                  <span className="font-label-md text-label-md text-secondary">{item.name}</span>
                </div>
                <p className="font-headline-md text-headline-md font-bold" style={{ color: item.fill }}>
                  {item.pct}%
                </p>
                <p className="text-secondary text-[11px] mt-xs">{item.value} sesi</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  )
}
