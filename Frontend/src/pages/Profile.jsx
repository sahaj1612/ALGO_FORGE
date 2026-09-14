import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  LoaderCircle,
  LogOut,
  Mail,
  User,
  Calendar,
  ShieldCheck,
  Code2,
  Trophy,
  AtSign,
  Copy,
  Check,
  Pencil,
  X,
  Sparkles,
  Cpu,
  Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

const fallbackPicture = name => {
  const initials = (name || 'User')
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') || 'U';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#7f1d1d"/><circle cx="60" cy="60" r="54" fill="#991b1b"/><text x="60" y="72" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="44" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const fileInput = useRef(null);

  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [stats, setStats] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    bio: '',
    preferredLanguage: 'javascript',
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');

    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API}/profile`, { headers })
      .then(response => (response.ok ? response.json() : Promise.reject()))
      .then(userData => {
        setUser(userData);
        setFormData({
          name: userData.name || '',
          handle: userData.handle || userData.name?.toLowerCase().replace(/\s+/g, '') || '',
          bio: userData.bio || 'Algorithm enthusiast & competitive programmer on AlgoForge.',
          preferredLanguage: userData.preferredLanguage || 'javascript',
        });
      })
      .catch(() => navigate('/login'));

    fetch(`${API}/submissions`, { headers })
      .then(response => (response.ok ? response.json() : []))
      .then(data => setSubmissions(Array.isArray(data) ? data : []))
      .catch(() => setSubmissions([]));

    const tzOffset = new Date().getTimezoneOffset();
    fetch(`${API}/user/stats?tzOffset=${tzOffset}`, { headers })
      .then(response => (response.ok ? response.json() : null))
      .then(statsData => {
        if (statsData) setStats(statsData);
      })
      .catch(() => {});
  }, [navigate]);

  const uploadPicture = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setMessage('Choose a PNG, JPEG, WebP, or GIF image smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      setMessage('');
      try {
        const response = await fetch(`${API}/profile/picture`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ picture: reader.result }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setUser(data);
        setMessage('Profile picture updated successfully.');
      } catch (error) {
        setMessage(error.message || 'Could not update your profile picture.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async e => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update profile');
      setUser(data);
      setIsEditing(false);
      setMessage('Profile details updated successfully.');
    } catch (error) {
      setMessage(error.message || 'Could not save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const copyUserId = () => {
    if (!user?._id) return;
    navigator.clipboard.writeText(user._id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-400">
        <div className="flex items-center gap-3">
          <LoaderCircle size={20} className="animate-spin text-red-500" />
          <span>Loading profile…</span>
        </div>
      </main>
    );
  }

  // Calculated Stats
  const totalSubmissions = submissions.length;
  const acceptedSubmissions = submissions.filter(
    s => s.status?.toLowerCase() === 'accepted'
  );
  const solvedProblemIds = new Set(
    acceptedSubmissions.map(s => String(s.problemId?._id || s.problemId || '')).filter(Boolean)
  );
  const solvedCount = solvedProblemIds.size;
  const acceptanceRate =
    totalSubmissions > 0 ? Math.round((acceptedSubmissions.length / totalSubmissions) * 100) : 0;

  const imageSource = user.picture || fallbackPicture(user.name);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 py-10 lg:grid-cols-[320px_1fr] lg:py-12">
        {/* Left Sidebar Card */}
        <aside className="h-fit rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-7 shadow-xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">Account</p>

          <div className="mt-6 flex flex-col items-center text-center">
            <div className="relative h-28 w-28 shrink-0">
              <img
                src={imageSource}
                alt={`${user.name}'s profile`}
                onError={event => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = fallbackPicture(user.name);
                }}
                className="h-28 w-28 rounded-full border-2 border-red-500 object-cover shadow-lg shadow-red-500/10"
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                aria-label="Change profile picture"
                className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-2 border-zinc-900 bg-red-600 text-white shadow transition hover:bg-red-500 disabled:opacity-60"
              >
                {uploading ? <LoaderCircle size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
            </div>

            <div className="mt-4">
              <h1 className="text-xl font-bold text-white">{user.name}</h1>
              <p className="text-xs text-zinc-400 mt-1">
                @{user.handle || user.name?.toLowerCase().replace(/\s+/g, '') || 'coder'}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-0.5 text-xs font-medium text-red-400">
                <span>Competitive Programmer</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="mt-6 w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60 shadow-md shadow-red-600/20"
          >
            {uploading ? 'Uploading photo…' : 'Change profile picture'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={uploadPicture}
            className="hidden"
          />
          <p className="mt-2 text-center text-[11px] text-zinc-500">
            PNG, JPEG, WebP, or GIF · up to 2 MB
          </p>

          {/* Quick Stats sidebar strip */}
          <div className="mt-6 border-t border-zinc-800/80 pt-6 grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800">
              <p className="text-xs text-zinc-400">Problems Solved</p>
              <p className="text-xl font-bold text-red-500 mt-1">{solvedCount} <span className="text-xs text-zinc-500 font-normal">/ 3</span></p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800">
              <p className="text-xs text-zinc-400">Submissions</p>
              <p className="text-xl font-bold text-zinc-200 mt-1">{totalSubmissions}</p>
            </div>
          </div>

          <div className="mt-6 border-t border-zinc-800/80 pt-6">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:border-red-500 hover:bg-red-600 hover:text-white"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Right Main Details Section */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-9 shadow-xl shadow-black/20 flex flex-col gap-8">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
                Profile settings
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">Personal information</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Your account details, security credentials, and workspace preferences.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Verified Account</span>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-[#262626] hover:border-red-500 hover:text-red-400 text-xs font-medium text-zinc-200 transition"
                >
                  <Pencil size={14} />
                  <span>Edit</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: user.name || '',
                      handle: user.handle || user.name?.toLowerCase().replace(/\s+/g, '') || '',
                      bio: user.bio || '',
                      preferredLanguage: user.preferredLanguage || 'javascript',
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-[#262626] hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback Message */}
          {message && (
            <div
              role="status"
              className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between ${
                message.includes('updated') || message.includes('success')
                  ? 'border-green-800/60 bg-green-950/40 text-green-300'
                  : 'border-red-800/60 bg-red-950/40 text-red-300'
              }`}
            >
              <span>{message}</span>
              <button
                onClick={() => setMessage('')}
                className="text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* EDIT FORM VIEW */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-[#262626] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none transition"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Username / Handle
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">@</span>
                    <input
                      type="text"
                      value={formData.handle}
                      onChange={e => setFormData({ ...formData, handle: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                      className="w-full rounded-xl border border-zinc-700 bg-[#262626] pl-8 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none transition"
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Email Address (Immutable)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Preferred Programming Language
                  </label>
                  <select
                    value={formData.preferredLanguage}
                    onChange={e => setFormData({ ...formData, preferredLanguage: e.target.value })}
                    className="w-full rounded-xl border border-zinc-700 bg-[#262626] px-4 py-3 text-sm text-white focus:border-red-500 focus:outline-none transition"
                  >
                    <option value="javascript">JavaScript (Node.js)</option>
                    <option value="cpp">C++ (GCC 17)</option>
                    <option value="python">Python 3</option>
                    <option value="java">Java 17</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Bio / Headline
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Share a brief overview of your coding journey or areas of focus..."
                  className="w-full rounded-xl border border-zinc-700 bg-[#262626] px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white transition shadow-lg shadow-red-600/20 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* VIEW MODE DETAILS */
            <div className="space-y-8">
              {/* PRIMARY CREDENTIALS */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                  <User size={14} className="text-red-400" />
                  <span>Personal Credentials</span>
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="p-4 rounded-xl bg-[#262626] border border-zinc-700/60 flex items-start gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                      <User size={18} />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-zinc-400">Full name</p>
                      <p className="text-base font-semibold text-white mt-0.5">{user.name}</p>
                    </div>
                  </div>

                  {/* Username / Handle */}
                  <div className="p-4 rounded-xl bg-[#262626] border border-zinc-700/60 flex items-start gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                      <AtSign size={18} />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-zinc-400">Username / Handle</p>
                      <p className="text-base font-semibold text-white mt-0.5">
                        @{user.handle || user.name?.toLowerCase().replace(/\s+/g, '') || 'coder'}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="p-4 rounded-xl bg-[#262626] border border-zinc-700/60 flex items-start gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                      <Mail size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-zinc-400">Email address</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          Primary
                        </span>
                      </div>
                      <p className="text-base font-semibold text-white mt-0.5 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Member Since */}
                  <div className="p-4 rounded-xl bg-[#262626] border border-zinc-700/60 flex items-start gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                      <Calendar size={18} />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-zinc-400">Member since</p>
                      <p className="text-base font-semibold text-white mt-0.5">
                        {new Date(user.createdAt).toLocaleDateString(undefined, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bio card */}
                <div className="mt-4 p-4 rounded-xl bg-[#262626] border border-zinc-700/60 flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-zinc-400">About / Headline</p>
                    <p className="text-sm text-zinc-200 mt-1 leading-relaxed">
                      {user.bio || 'Algorithm enthusiast & competitive programmer on AlgoForge.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECURITY & AUTHENTICATION */}
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-red-400" />
                  <span>Security & Account Credentials</span>
                </h3>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <p className="text-xs text-zinc-400">Authentication Method</p>
                    <p className="text-sm font-semibold text-zinc-100 mt-1 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      {user.googleId ? 'Google OAuth 2.0' : 'Email & Password'}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">Single sign-on enabled</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <p className="text-xs text-zinc-400">Account Status</p>
                    <p className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Active & Verified
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">Full platform privileges</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">Account ID</p>
                      <button
                        type="button"
                        onClick={copyUserId}
                        className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                      >
                        {copiedId ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs font-mono text-zinc-300 mt-1.5 truncate">
                      {user._id}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">System identifier</p>
                  </div>
                </div>
              </div>

              {/* CODING & WORKSPACE PREFERENCES */}
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                  <Code2 size={14} className="text-red-400" />
                  <span>Developer Environment & Preferences</span>
                </h3>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <p className="text-xs text-zinc-400">Preferred Language</p>
                    <p className="text-sm font-semibold text-red-400 mt-1 uppercase tracking-wide">
                      {user.preferredLanguage || 'JavaScript'}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">Default in problem solver</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <p className="text-xs text-zinc-400">Code Editor Theme</p>
                    <p className="text-sm font-semibold text-zinc-200 mt-1">AlgoForge Grey</p>
                    <p className="text-[11px] text-zinc-500 mt-1">#262626 Monaco Dark</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <p className="text-xs text-zinc-400">Execution Sandbox</p>
                    <p className="text-sm font-semibold text-zinc-200 mt-1 flex items-center gap-1.5">
                      <Cpu size={14} className="text-red-400" />
                      Docker Isolated
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">BullMQ + Redis Worker</p>
                  </div>
                </div>
              </div>

              {/* PERFORMANCE & ACTIVITY OVERVIEW */}
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                  <Trophy size={14} className="text-red-400" />
                  <span>Platform Activity & Standing</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 text-center">
                    <p className="text-xs text-zinc-400">Solved</p>
                    <p className="text-xl font-bold text-red-500 mt-1">
                      {solvedCount} <span className="text-xs text-zinc-500 font-normal">/ 3</span>
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 text-center">
                    <p className="text-xs text-zinc-400">Submissions</p>
                    <p className="text-xl font-bold text-zinc-200 mt-1">{totalSubmissions}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 text-center">
                    <p className="text-xs text-zinc-400">Accuracy</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">{acceptanceRate}%</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 text-center">
                    <p className="text-xs text-zinc-400">Standing</p>
                    <p className="text-xl font-bold text-amber-400 mt-1">
                      {stats?.ranking || 'Top 0%'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
