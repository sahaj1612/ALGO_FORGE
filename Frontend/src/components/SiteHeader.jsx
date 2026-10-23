import { useEffect, useState } from 'react';
import { Code2, LogIn, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitialsAvatar, getUserAvatar } from '../utils/userAvatar';

export default function SiteHeader({ homeTheme, onToggleTheme }) {
  const navigate = useNavigate();
  const { user, loginWithGoogle, requireAuth } = useAuth();
  const [pageTheme, setPageTheme] = useState(() => localStorage.getItem('algoforge-theme') || 'dark');
  const activeTheme = homeTheme || pageTheme;

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    window.dispatchEvent(new CustomEvent('algoforge-theme-change', { detail: activeTheme }));
  }, [activeTheme]);

  const toggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
      return;
    }
    const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('algoforge-theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    setPageTheme(nextTheme);
  };

  return (
    <nav className="af-nav">
      <button
        onClick={() => navigate('/')}
        className="af-brand"
      >
        <span className="af-brand-mark"><Code2 /></span> <span>Algo<span className="af-brand-accent">Forge</span></span>
      </button>

      <div className="af-nav-right">
        <div className="af-nav-links">
          <button
            onClick={() => requireAuth(() => navigate('/practice'))}
            className="af-nav-link"
          >
            Practice
          </button>
          <button
            onClick={() => requireAuth(() => navigate('/explore'))}
            className="af-nav-link"
          >
            Problems
          </button>
          {user && (
            <button
              onClick={() => requireAuth(() => navigate('/dashboard'))}
              className="af-nav-link"
            >
              Dashboard
            </button>
          )}
        </div>

        <button className="af-theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${activeTheme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${activeTheme === "dark" ? "light" : "dark"} theme`}>
          {activeTheme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        {user ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => requireAuth(() => navigate('/profile'))}
              className="af-profile-button"
              aria-label="Open profile"
              title={user.name}
            >
              <img
                src={getUserAvatar(user)}
                alt={user.name || "Profile"}
                referrerPolicy="no-referrer"
                onError={event => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = getInitialsAvatar(user);
                }}
                className="af-profile-image"
              />
            </button>
          </div>
        ) : (
          <button
            onClick={loginWithGoogle}
            className="af-login-button"
          >
            <LogIn size={15} /> Login
          </button>
        )}
      </div>
    </nav>
  );
}
