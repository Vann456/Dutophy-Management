import { useEffect, useState } from 'react';
import NotificationDropdown from './NotificationDropdown';

const Header = ({ title = 'Overview Keuangan', user, onLogout }) => {
  const [wib, setWib] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setWib(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateString = wib.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const timeString = wib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });

  return (
    <header className="bg-surface border-b border-outline-variant flex justify-between items-center h-16 px-md sticky top-0 z-30 w-full shadow-sm">
      <div className="flex items-center">
        <button className="md:hidden mr-sm p-sm rounded-full text-on-surface-variant hover:bg-surface-container-high transition-all">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h2 className="font-headline-md text-headline-md font-bold text-primary md:hidden">Dutophy</h2>
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface hidden md:block">{title}</h2>
      </div>
      
      <div className="flex items-center space-x-md">
        <div className="text-right hidden md:block">
          <div className="font-body-md text-label-md text-on-surface-variant">{dateString}</div>
          <div className="font-headline-sm text-headline-sm font-semibold">{timeString} WIB</div>
        </div>
        
        <NotificationDropdown />
        
        <div className="flex items-center space-x-sm border-l border-outline-variant pl-md">
          <div className="text-right hidden md:block">
            <p className="font-label-md text-label-md text-on-surface font-semibold">{user?.name || 'User Profile'}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{user?.role || 'Bendahara'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant">
            <img 
              alt="User Profile" 
              className="w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=256&q=80"
            />
          </div>
          {onLogout && (
            <button onClick={onLogout} className="hidden md:inline-flex items-center justify-center px-3 py-2 rounded-lg border border-outline-variant text-label-sm font-medium text-primary hover:bg-surface-container transition-colors">
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
