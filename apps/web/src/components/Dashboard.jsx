import { useState, useEffect } from 'react'
import { fetchTransactions } from '../api'

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => { loadTransactions() }, [refreshKey])

  useEffect(() => {
    const inc = () => setRefreshKey(prev => prev + 1)
    window.addEventListener('transactions:updated', inc)
    return () => window.removeEventListener('transactions:updated', inc)
  }, [])

  const loadTransactions = async () => {
    try {
      const data = await fetchTransactions()
      setTransactions(data || [])
    } catch (err) {
      console.error('Gagal memuat transaksi', err)
    }
  }

  // Combine all transactions, sort by date descending, take top 5
  const recentTransactions = [...transactions]
    .filter(t => t.status === 'Approved')
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0)
      const dateB = new Date(b.createdAt || 0)
      return dateB - dateA
    })
    .slice(0, 5)
  return (
    <div className="bg-surface text-on-surface h-screen flex overflow-hidden">
      {/* SideNavBar */}
      <aside className="w-64 h-screen fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant flex flex-col py-md px-sm z-40 hidden md:flex">
        <div className="mb-lg px-sm">
          <div className="flex flex-col items-start gap-2">
            <img 
              alt="Dutophy Logo" 
              className="w-12 h-12 object-contain" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWZMS386cXFRPFEhB-OgodAfr6StZObRpdyWvl5afTEG26pvzntdlGHSwuJomi4cRLWwzJpTNQp0dNheiwLKwgSeyIi0jbf50Fhzxv9LlIiVkcMyBpX3AA545fJNOlCLpV8HJ0s0L8fcHieX9LzTsZa241hI60pStlXTe8VG8wvYjw7AABWO-bpirXfs6OOtW_JIKf1KLEArzfu2JNq4BNqQ6Mlkwz7FCbHy_5_2zS3gDRbe3BpejnGCXSqmG6_FgTFSr_bmnhWBrv1g" 
            />
            <div>
              <h1 className="font-display-lg text-display-lg font-bold text-primary">Dutophy</h1>
              <p className="font-label-md text-label-md text-secondary">Cinematography Extracurricular</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 space-y-base">
          <a className="flex items-center space-x-sm px-sm py-sm rounded-lg text-primary font-bold border-r-4 border-primary bg-surface-container transition-colors duration-200" href="#">
            <span className="material-symbols-outlined" style={{fontVariationSettings: '"FILL" 1'}}>dashboard</span>
            <span className="font-body-md text-body-md">Dashboard</span>
          </a>
          <a className="flex items-center space-x-sm px-sm py-sm rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition-colors duration-200" href="#">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="font-body-md text-body-md">Pemasukan</span>
          </a>
          <a className="flex items-center space-x-sm px-sm py-sm rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition-colors duration-200" href="#">
            <span className="material-symbols-outlined">payments</span>
            <span className="font-body-md text-body-md">Pengeluaran</span>
          </a>
          <a className="flex items-center space-x-sm px-sm py-sm rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition-colors duration-200" href="#">
            <span className="material-symbols-outlined">history</span>
            <span className="font-body-md text-body-md">Riwayat</span>
          </a>
          <a className="flex items-center space-x-sm px-sm py-sm rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition-colors duration-200" href="#">
            <span className="material-symbols-outlined">analytics</span>
            <span className="font-body-md text-body-md">Statistik</span>
          </a>
          <a className="flex items-center space-x-sm px-sm py-sm rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition-colors duration-200" href="#">
            <span className="material-symbols-outlined">group</span>
            <span className="font-body-md text-body-md">Anggota</span>
          </a>
          <a className="flex items-center space-x-sm px-sm py-sm rounded-lg text-secondary hover:text-primary hover:bg-surface-container transition-colors duration-200" href="#">
            <span className="material-symbols-outlined">how_to_reg</span>
            <span className="font-body-md text-body-md">Persetujuan</span>
          </a>
        </nav>
        
        <div className="mt-auto pt-md">
          <button className="w-full bg-primary-container text-primary font-body-md text-body-md font-bold py-sm rounded-lg hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center space-x-xs">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Tambah Transaksi</span>
          </button>
        </div>
      </aside>
      
      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-64 w-full h-full overflow-hidden">
        {/* TopAppBar */}
        <header className="bg-surface border-b border-outline-variant flex justify-between items-center h-16 px-md sticky top-0 z-30 w-full shadow-sm">
          <div className="flex items-center">
            <button className="md:hidden mr-sm p-sm rounded-full text-on-surface-variant hover:bg-surface-container-high transition-all">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="font-headline-md text-headline-md font-bold text-primary md:hidden">Dutophy</h2>
          </div>
          <div className="flex items-center space-x-md">
            <span className="font-body-md text-label-md text-on-surface-variant hidden md:block">Kamis, 24 Mei 2024</span>
            <div className="relative">
              <button className="p-sm rounded-full text-on-surface-variant hover:bg-surface-container-high transition-all focus:ring-2 focus:ring-primary relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
              </button>
            </div>
            <div className="flex items-center space-x-sm border-l border-outline-variant pl-md">
              <div className="text-right hidden md:block">
                <p className="font-label-md text-label-md text-on-surface font-semibold">User Profile</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Bendahara</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant">
                <img 
                  alt="User Profile" 
                  className="w-full h-full object-cover" 
                  data-alt="A professional headshot of a person in a corporate setting, soft lighting, neutral background, modern and clean aesthetic." 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgaLlJlIbSOqo_nDpjfCvcACj7I9gZNSUOW2iYVszdYKdlHxnPmMqNO8lkpcJQ4nT3VzzhTFxEIePofvoICNRP0Vy7pPXeAyJSQ-U0sXQfnn-r2DXlLIrbbRxb5o8JBKPqL84-NZRERg819bQjBN20IbtKANXsf4qCl7FQVLh52s32HJ8ufShxfdHjxe20kOLVkue51dS4-TrlJ3cBdUTY0zP0yoC-vMUHuORtAEo7vdwArT8WN32ncXUsgG43xnroPYyc3z71fNc" 
                />
              </div>
            </div>
          </div>
        </header>
        
        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-margin-mobile md:p-gutter bg-surface">
          <div className="max-w-[1280px] mx-auto space-y-gutter">
            {/* Welcome Section */}
            <div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-primary">Overview Keuangan</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-xs">Ringkasan aktivitas keuangan Dutophy saat ini.</p>
            </div>
            
            {/* Bento Grid for Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {/* Total Kas Card */}
              <div className="col-span-1 md:col-span-2 bg-surface-container p-md rounded-xl border border-surface-variant relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container opacity-30 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Total Uang Kas</p>
                  <h3 className="font-display-lg text-display-lg font-bold text-primary mt-sm">Rp 12.450.000</h3>
                </div>
                <div className="mt-lg flex items-center space-x-md">
                  <div className="flex items-center text-success bg-success-container px-sm py-xs rounded-full">
                    <span className="material-symbols-outlined text-[16px] mr-xs">trending_up</span>
                    <span className="font-label-md text-label-md">+15% dari bulan lalu</span>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface-variant">Terakhir diperbarui: Hari ini, 08:30</span>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-rows-2 gap-gutter">
                <div className="bg-surface-container p-md rounded-xl border border-surface-variant flex items-center justify-between">
                  <div>
                    <p className="font-label-md text-label-md text-on-surface-variant">Pemasukan Bulan Ini</p>
                    <p className="font-headline-md text-headline-md font-bold text-on-surface mt-xs">Rp 2.100.000</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">arrow_downward</span>
                  </div>
                </div>
                <div className="bg-surface-container p-md rounded-xl border border-surface-variant flex items-center justify-between">
                  <div>
                    <p className="font-label-md text-label-md text-on-surface-variant">Pengeluaran Bulan Ini</p>
                    <p className="font-headline-md text-headline-md font-bold text-on-surface mt-xs">Rp 850.000</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-error">
                    <span className="material-symbols-outlined">arrow_upward</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Charts & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
              {/* Chart Area */}
              <div className="lg:col-span-2 bg-surface-container p-md rounded-xl border border-surface-variant flex flex-col">
                <div className="flex justify-between items-center mb-lg">
                  <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Arus Kas</h3>
                  <select className="bg-surface border-surface-variant text-label-md font-label-md rounded-lg focus:ring-primary text-on-surface py-sm px-md cursor-pointer">
                    <option>6 Bulan Terakhir</option>
                    <option>Tahun Ini</option>
                  </select>
                </div>
                
                {/* CSS/Div based Chart Mockup */}
                <div className="flex-1 flex items-end justify-between space-x-xs h-48 mt-auto pt-lg border-b border-surface-variant pb-xs relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-label-md font-label-md text-on-surface-variant pb-xs -ml-md pr-sm items-end w-md">
                    <span>3M</span>
                    <span>2M</span>
                    <span>1M</span>
                  </div>
                  {/* Bars */}
                  <div className="w-full flex justify-around items-end h-full px-sm ml-sm">
                    <div className="w-8 h-[40%] bg-primary-fixed rounded-t-sm hover:bg-primary transition-colors relative group">
                      <div className="absolute bottom-full mb-xs left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-label-sm px-sm py-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden group-hover:block pointer-events-none">Rp 1.2M</div>
                    </div>
                    <div className="w-8 h-[60%] bg-primary rounded-t-sm hover:bg-primary-fixed transition-colors relative group">
                      <div className="absolute bottom-full mb-xs left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-label-sm px-sm py-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden group-hover:block pointer-events-none">Rp 1.8M</div>
                    </div>
                    <div className="w-8 h-[30%] bg-primary-fixed rounded-t-sm hover:bg-primary transition-colors"></div>
                    <div className="w-8 h-[80%] bg-primary rounded-t-sm hover:bg-primary-fixed transition-colors"></div>
                    <div className="w-8 h-[50%] bg-primary-fixed rounded-t-sm hover:bg-primary transition-colors"></div>
                    <div className="w-8 h-[90%] bg-primary rounded-t-sm hover:bg-primary-fixed transition-colors"></div>
                  </div>
                </div>
                <div className="flex justify-around mt-sm px-sm ml-sm text-label-md font-label-md text-on-surface-variant">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>Mei</span>
                  <span>Jun</span>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="bg-surface-container p-md rounded-xl border border-surface-variant flex flex-col">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-lg">Aksi Cepat</h3>
                <div className="grid grid-cols-2 gap-sm flex-1">
                  <button className="bg-surface-container-low flex flex-col items-center justify-center p-md rounded-lg hover:bg-surface transition-colors text-primary border border-surface-variant">
                    <span className="material-symbols-outlined text-[32px] mb-sm">receipt_long</span>
                    <span className="font-label-md text-label-md text-on-surface">Buat Tagihan</span>
                  </button>
                  <button className="bg-surface-container-low flex flex-col items-center justify-center p-md rounded-lg hover:bg-surface transition-colors text-primary border border-surface-variant">
                    <span className="material-symbols-outlined text-[32px] mb-sm">group_add</span>
                    <span className="font-label-md text-label-md text-on-surface">Bayar Iuran</span>
                  </button>
                  <button className="bg-surface-container-low flex flex-col items-center justify-center p-md rounded-lg hover:bg-surface transition-colors text-primary border border-surface-variant">
                    <span className="material-symbols-outlined text-[32px] mb-sm">description</span>
                    <span className="font-label-md text-label-md text-on-surface">Laporan</span>
                  </button>
                  <button className="bg-surface-container-low flex flex-col items-center justify-center p-md rounded-lg hover:bg-surface transition-colors text-primary border border-surface-variant">
                    <span className="material-symbols-outlined text-[32px] mb-sm">settings</span>
                    <span className="font-label-md text-label-md text-on-surface">Pengaturan</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Recent Transactions Table */}
            <div className="bg-surface-container rounded-xl border border-surface-variant overflow-hidden">
              <div className="p-md border-b border-surface-variant flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Transaksi Terakhir</h3>
                <button className="text-primary font-label-md text-label-md hover:underline">Lihat Semua</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-surface-variant">
                      <th className="py-sm px-md font-label-md text-label-md text-on-surface-variant">Tanggal</th>
                      <th className="py-sm px-md font-label-md text-label-md text-on-surface-variant">Deskripsi</th>
                      <th className="py-sm px-md font-label-md text-label-md text-on-surface-variant">Kategori</th>
                      <th className="py-sm px-md font-label-md text-label-md text-on-surface-variant text-right">Jumlah</th>
                      <th className="py-sm px-md font-label-md text-label-md text-on-surface-variant">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.length ? recentTransactions.map((tx) => {
                      const createdAt = tx?.createdAt ? new Date(tx.createdAt) : null
                      const formattedDate = createdAt && !Number.isNaN(createdAt.getTime())
                        ? createdAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                        : '—'
                      const isIncome = tx.type === 'Pemasukan'
                      const amountFormatted = isIncome
                        ? `+ Rp ${(tx.amount || 0).toLocaleString('id-ID')}`
                        : `- Rp ${(tx.amount || 0).toLocaleString('id-ID')}`
                      const statusLabel = tx.status === 'Approved' ? 'Selesai' : tx.status === 'Rejected' ? 'Ditolak' : 'Proses'
                      const statusClass = tx.status === 'Approved'
                        ? 'bg-success-container text-success'
                        : tx.status === 'Rejected'
                          ? 'bg-error-container text-error'
                          : 'bg-surface-variant text-on-surface-variant'
                      return (
                        <tr key={tx.id} className={`border-b border-surface-variant hover:bg-surface transition-colors`}>
                          <td className="py-sm px-md font-label-md text-label-md text-on-surface">{formattedDate}</td>
                          <td className="py-sm px-md font-label-md text-label-md text-on-surface font-semibold">{tx.description || '—'}</td>
                          <td className="py-sm px-md font-label-md text-label-md text-on-surface-variant">{tx.type || '—'}</td>
                          <td className={`py-sm px-md font-label-md text-label-md text-right ${isIncome ? 'text-success' : 'text-on-surface'}`}>{amountFormatted}</td>
                          <td className="py-sm px-md">
                            <span className={`inline-block font-label-md text-label-sm px-sm py-xs rounded ${statusClass}`}>{statusLabel}</span>
                          </td>
                        </tr>
                      )
                    }) : (
                      <tr>
                        <td colSpan="5" className="py-lg px-md text-center text-on-surface-variant font-label-md text-label-md">
                          Belum ada transaksi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
