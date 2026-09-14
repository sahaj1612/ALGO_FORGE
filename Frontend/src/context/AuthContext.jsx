import React, { createContext, useContext, useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';

const AuthContext = createContext();

const API = 'http://localhost:5000/api';

export function GoogleLogo() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function LoginModal({ isOpen, onClose, onLogin, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-7 sm:p-8 text-center shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-500 shadow-lg shadow-red-500/10">
          <Lock size={28} />
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight">Login Required</h2>
        <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
          {message || 'You need to sign in with your Google account first to access practice problems, dashboard, and features.'}
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={onLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-zinc-900 shadow-lg transition hover:bg-zinc-100 active:scale-95"
          >
            <GoogleLogo />
            <span>Sign in with Google</span>
          </button>

          <button
            onClick={onClose}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-800/60 px-5 py-3 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    const tokenFromRedirect = new URLSearchParams(window.location.search).get('token');
    if (tokenFromRedirect) {
      localStorage.setItem('token', tokenFromRedirect);
      setToken(tokenFromRedirect);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const currentToken = tokenFromRedirect || localStorage.getItem('token');
    if (!currentToken) {
      setUser(null);
      return;
    }

    let active = true;
    fetch(`${API}/profile`, { headers: { Authorization: `Bearer ${currentToken}` } })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(profile => {
        if (active) setUser(profile);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setToken(null);
        if (active) setUser(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const loginWithGoogle = () => {
    window.location.href = 'http://localhost:5000/auth/google';
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const requireAuth = (callback, customMessage) => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      setModalMessage(customMessage || 'Please sign in with your Google account first to continue.');
      setModalOpen(true);
      return false;
    }
    if (typeof callback === 'function') {
      callback();
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!(user || token),
        loginWithGoogle,
        logout,
        requireAuth,
        openLoginModal: (msg) => {
          setModalMessage(msg || '');
          setModalOpen(true);
        },
      }}
    >
      {children}
      <LoginModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onLogin={loginWithGoogle}
        message={modalMessage}
      />
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
