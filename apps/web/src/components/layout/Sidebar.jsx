const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'pemasukan', label: 'Pemasukan', icon: 'account_balance_wallet' },
  { id: 'pengeluaran', label: 'Pengeluaran', icon: 'payments' },
  { id: 'riwayat', label: 'Riwayat', icon: 'history' },
  { id: 'statistik', label: 'Statistik', icon: 'analytics' },
  { id: 'anggota', label: 'Anggota', icon: 'group' },
  { id: 'persetujuan', label: 'Persetujuan', icon: 'how_to_reg' },
];

const Sidebar = ({ activePage = 'dashboard', onNavigate, onOpenAddTransaction }) => {
  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant flex-col py-md px-sm z-40 hidden md:flex no-print">
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
        {navItems.map((item) => {
          const isActive = item.id === activePage;
          return (
            <button
              key={item.id}
              className={`w-full flex items-center space-x-sm px-sm py-sm rounded-lg transition-colors duration-200 text-left ${
                isActive
                  ? 'text-primary font-bold border-r-4 border-primary bg-surface-container'
                  : 'text-secondary hover:text-primary hover:bg-surface-container'
              }`}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <span
                className="material-symbols-outlined"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-body-md text-body-md">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="mt-auto pt-md">
        <button
          className="w-full bg-primary-container text-primary font-body-md text-body-md font-bold py-sm rounded-lg hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center space-x-xs"
          onClick={() => onOpenAddTransaction?.()}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Tambah Transaksi</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
