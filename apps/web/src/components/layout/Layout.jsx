import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileDrawer from './MobileDrawer';

const Layout = ({ activePage, onNavigate, title, children, user, onLogout, onOpenAddTransaction, onOpenProfile }) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="bg-surface text-on-surface h-screen flex overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={onNavigate} onOpenAddTransaction={onOpenAddTransaction} />
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        activePage={activePage}
        onNavigate={onNavigate}
        onOpenAddTransaction={onOpenAddTransaction}
      />
      <div className="flex-1 flex flex-col md:ml-64 w-full h-full overflow-hidden">
        <Header
          title={title}
          user={user}
          onLogout={onLogout}
          onOpenProfile={onOpenProfile}
          onToggleSidebar={() => setMobileDrawerOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-margin-mobile md:p-gutter bg-surface">
          <div className="max-w-[1280px] mx-auto space-y-gutter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
