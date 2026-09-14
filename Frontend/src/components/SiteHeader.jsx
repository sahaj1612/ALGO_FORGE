import { Code2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SiteHeader() {
  const navigate = useNavigate();
  const { user, loginWithGoogle, requireAuth } = useAuth();

  return (
    <nav className="flex items-center justify-between border-b border-red-900/40 px-5 py-4 sm:px-8 sm:py-5">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-2xl font-bold text-red-500 cursor-pointer"
      >
        <Code2 /> AlgoForge
      </button>

      <div className="flex items-center gap-3 sm:gap-6">
        <div className="hidden items-center gap-6 md:flex">
          <button
            onClick={() => requireAuth(() => navigate('/practice'))}
            className="font-medium text-white hover:text-red-500 cursor-pointer"
          >
            Practice
          </button>
          <button
            onClick={() => requireAuth(() => navigate('/explore'))}
            className="font-medium text-white hover:text-red-500 cursor-pointer"
          >
            Problems
          </button>
          {user && (
            <button
              onClick={() => requireAuth(() => navigate('/dashboard'))}
              className="font-medium text-white hover:text-red-500 cursor-pointer"
            >
              Dashboard
            </button>
          )}
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => requireAuth(() => navigate('/profile'))}
              className="flex items-center transition hover:scale-105"
              aria-label="Open profile"
              title={user.name}
            >
              <img
                src={
                  user.picture ||
                  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                    user.name
                  )}`
                }
                alt={user.name || "Profile"}
                onError={event => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                    user.name
                  )}`;
                }}
                className="h-9 w-9 rounded-full border-2 border-red-500 object-cover"
              />
            </button>
          </div>
        ) : (
          <button
            onClick={loginWithGoogle}
            className="rounded-2xl border border-red-500 px-4 py-2 text-red-500 transition hover:bg-red-600 hover:text-white"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
