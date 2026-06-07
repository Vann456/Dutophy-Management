import { useEffect, useState, useRef } from 'react';
import NotificationDropdown from './NotificationDropdown';

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=256&q=80';

const Header = ({ title = 'Overview Keuangan', user, onLogout, onOpenProfile, onToggleSidebar }) => {
  const [wib, setWib] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setWib(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dateString = wib.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const timeString = wib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });

  const handleOpenProfile = () => {
    setShowProfileMenu(false);
    if (onOpenProfile) onOpenProfile();
  };

  return (
    <header className="bg-surface border-b border-outline-variant flex justify-between items-center h-16 px-md sticky top-0 z-30 w-full shadow-sm">
      <div className="flex items-center">
        <button
          onClick={onToggleSidebar}
          className="md:hidden mr-sm p-sm rounded-full text-on-surface-variant hover:bg-surface-container-high transition-all"
          type="button"
        >
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
        
        <div className="flex items-center space-x-sm border-l border-outline-variant pl-md relative" ref={menuRef}>
          <div className="text-right hidden md:block">
            <p className="font-label-md text-label-md text-on-surface font-semibold">{user?.name || 'User Profile'}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{user?.role || 'Bendahara'}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border border-outline-variant cursor-pointer hover:ring-2 hover:ring-primary transition-all flex-shrink-0"
          >
            <img 
              alt="User Profile" 
              className="w-full h-full object-cover" 
              src={user?.avatarUrl || FALLBACK_AVATAR}
            />
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-xs w-48 bg-surface-container border border-outline-variant rounded-lg shadow-xl overflow-hidden z-50">
              <button
                type="button"
                onClick={handleOpenProfile}
                className="w-full flex items-center gap-sm px-md py-sm text-on-surface hover:bg-surface-container-high transition-colors text-label-md"
              >
                <span className="material-symbols-outlined text-[18px]">person_edit</span>
                Ubah Profil
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center gap-sm px-md py-sm text-on-surface hover:bg-surface-container-high transition-colors text-label-md border-t border-outline-variant"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
