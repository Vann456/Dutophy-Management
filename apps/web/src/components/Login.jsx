import { useState } from 'react';

export default function Login({ onLogin, onRegister, error }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!username || !password) {
      setLocalError('Masukkan email/username dan password');
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'register') {
        if (!name) {
          setLocalError('Masukkan nama lengkap untuk pendaftaran');
          return;
        }
        await onRegister({ username, password, name, email });
      } else {
        await onLogin({ username, password });
      }
    } catch (err) {
      setLocalError(err.message || 'Login gagal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop relative overflow-hidden font-body-md antialiased selection:bg-primary-container selection:text-primary-fixed">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="absolute w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] translate-x-[-20%] translate-y-[-20%]"></div>
        <div className="absolute w-[500px] h-[500px] bg-tertiary/5 rounded-full blur-[100px] translate-x-[30%] translate-y-[30%]"></div>
      </div>
      
      <main className="w-full max-w-[440px] bg-surface-container-low border border-outline-variant/60 rounded-xl relative z-10 shadow-2xl backdrop-blur-md flex flex-col pt-lg pb-md px-md md:px-lg">
        <div className="absolute top-0 left-0 right-0 h-[1px] glass-top-edge rounded-t-xl"></div>
        
        <header className="flex flex-col items-center text-center mb-lg">
          <div className="flex flex-col items-center gap-2">
            <img 
              alt="Dutophy Logo" 
              className="w-16 h-16 object-contain mb-2" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuANmp0VPDQ87Etk9u9AKrK19nAiar1IkGuVjlkpbcvSIIbx2nbPS4FtHAXbl4TIC4ttdHwrAGsLjZRJIUwBRCSgK1aH6xt2Gsot0RmC71pXfmVjE_wDuiQWeOYdAfZlJVPLZWb-9KrPypMdcKR9s7Zxl0Hx7BLXD5davEeDcAtEh_vX2TImmzcnhSS7N8TRmg4w_Q9G5KjWaodXvzUNkoI4--py8IQyDEiB5DMlokxIKSfOGbJlcoXjMBJhld0xUTtXzgP8lDOh8sIDDg" 
            />
            <div>
              <h1 className="font-display-lg text-display-lg font-bold text-primary">Dutophy</h1>
              <p className="font-label-md text-label-md text-secondary">Cinematography Extracurricular</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant opacity-70 mt-1">SMAN 12 Kota Tangerang Selatan</p>
            </div>
          </div>
        </header>
        
        <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface ml-xs" htmlFor="username">Email atau Username</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/70 pointer-events-none" style={{ fontSize: '20px' }}>person</span>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg pl-[40px] pr-sm py-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200 shadow-inner"
                placeholder="Masukkan email/username"
                type="text"
              />
            </div>
          </div>
          
          {mode === 'register' && (
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface ml-xs" htmlFor="name">Nama Lengkap</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-sm py-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200 shadow-inner"
                placeholder="Masukkan nama lengkap"
                type="text"
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface ml-xs" htmlFor="email">Email</label>
              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-sm py-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200 shadow-inner"
                placeholder="Masukkan email opsional"
                type="email"
              />
            </div>
          )}

          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface ml-xs" htmlFor="password">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant/70 pointer-events-none" style={{ fontSize: '20px' }}>lock</span>
              <input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg pl-[40px] pr-[40px] py-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all duration-200 shadow-inner"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors duration-200"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <div className="flex justify-between items-center mt-xs">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="font-label-sm text-label-sm text-primary hover:text-primary-fixed transition-colors duration-200 focus:outline-none focus:underline bg-transparent border-none p-0 cursor-pointer"
              >
                Lupa Password?
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode((current) => (current === 'login' ? 'register' : 'login'));
                  setLocalError('');
                }}
                className="font-label-sm text-label-sm text-primary hover:text-primary-fixed transition-colors duration-200 focus:outline-none focus:underline"
              >
                {mode === 'login' ? 'Daftar akun baru' : 'Kembali ke login'}
              </button>
            </div>
          </div>

          {(localError || error) && (
            <div className="rounded-lg border border-error-container bg-error-container/10 p-sm text-error font-body-sm">
              {localError || error}
            </div>
          )}

          <button className="group w-full bg-primary-container text-tertiary-fixed font-label-md text-label-md py-md rounded-lg mt-sm flex items-center justify-center gap-xs hover:bg-on-primary-fixed hover:text-primary-fixed focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all duration-300" type="submit" disabled={submitting}>
            <span>{submitting ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}</span>
            <span className="material-symbols-outlined transition-transform duration-300 group-hover:translate-x-1" style={{ fontSize: '18px' }}>arrow_forward</span>
          </button>
        </form>
        
        <footer className="mt-lg pt-md border-t border-outline-variant/30 text-center">
          <div className="flex items-center justify-center gap-xs text-on-surface-variant opacity-60">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>photo_camera</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>movie_edit</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_cut</span>
          </div>
        </footer>
      </main>

      {/* ─── Lupa Password Modal ─────────────────────────────── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForgotModal(false)}>
          <div 
            className="w-full max-w-md bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-md border-b border-outline-variant flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">Lupa Password</h3>
              <button 
                type="button" 
                onClick={() => setShowForgotModal(false)} 
                className="p-2 rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-md space-y-md">
              <div className="flex flex-col items-center text-center gap-md py-lg">
                <div className="w-16 h-16 rounded-full bg-amber-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400 text-3xl">lock_reset</span>
                </div>
                <div>
                  <p className="font-body-md text-body-md text-on-surface mb-sm font-semibold">
                    Hubungi Ketua atau Wakil Ketua
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Silakan hubungi Ketua atau Wakil Ketua (Admin) untuk melakukan reset password akun Anda secara langsung melalui Manajemen Pengurus.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-md border-t border-outline-variant flex justify-end bg-surface-container-lowest">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-md py-sm rounded-lg bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}