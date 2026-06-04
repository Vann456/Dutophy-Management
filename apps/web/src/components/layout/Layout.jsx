import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ activePage, onNavigate, title, children, user, onLogout, onOpenAddTransaction }) => {
  return (
    <div className="bg-surface text-on-surface h-screen flex overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={onNavigate} onOpenAddTransaction={onOpenAddTransaction} />
      <div className="flex-1 flex flex-col md:ml-64 w-full h-full overflow-hidden">
        <Header title={title} user={user} onLogout={onLogout} />
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
