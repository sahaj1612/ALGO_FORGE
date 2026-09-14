import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

export default function ProblemsList() {
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const [problems, setProblems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [topic, setTopic] = useState('');
  const [cursor, setCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCursor(null);
    setCursorHistory([]);
  }, [search, difficulty, topic]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (difficulty) params.set('difficulty', difficulty);
    if (topic) params.set('topic', topic);
    if (cursor) params.set('cursor', cursor);
    params.set('limit', '15');

    setLoading(true);
    fetch(`${API}/problems?${params}`, { headers })
      .then(r => (r.ok ? r.json() : { items: [], total: 0, nextCursor: null }))
      .then(data => {
        setProblems(data.items || []);
        setTotal(data.total || 0);
        setNextCursor(data.nextCursor || null);
      })
      .catch(() => {
        setProblems([]);
        setTotal(0);
        setNextCursor(null);
      })
      .finally(() => setLoading(false));
  }, [search, difficulty, topic, cursor]);

  const handleNextPage = () => {
    if (nextCursor) {
      setCursorHistory(prev => [...prev, cursor]);
      setCursor(nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prevCursor = cursorHistory[cursorHistory.length - 1];
      setCursorHistory(prev => prev.slice(0, -1));
      setCursor(prevCursor);
    }
  };

  const TOPIC_LIST = [
    'Arrays',
    'Strings',
    'Linked List',
    'Stack',
    'Queue',
    'Trees',
    'Graphs',
    'Dynamic Programming',
    'Binary Search',
    'Math'
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />
      <main className="p-6 sm:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-red-500 tracking-tight">Explore Problems</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Curated collection of algorithm and data structure problems with live Docker judging.
            </p>
          </div>
          <div className="text-xs text-zinc-500 font-medium">
            {total} published problems
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title or topic..."
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none transition"
            />
          </div>

          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:border-red-500 focus:outline-none transition cursor-pointer"
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <select
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:border-red-500 focus:outline-none transition cursor-pointer"
          >
            <option value="">All Topics</option>
            {TOPIC_LIST.map(val => (
              <option key={val} value={val}>
                {val}
              </option>
            ))}
          </select>
        </div>

        {/* Problems List Table / Cards */}
        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-12 text-center text-zinc-500">
            Loading problems...
          </div>
        ) : problems.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-12 text-center text-zinc-400">
            No problems match your current search and filter criteria.
          </div>
        ) : (
          <div className="space-y-3">
            {problems.map(p => {
              const targetSlug = p.slug || p._id;

              return (
                <div
                  key={p._id}
                  onClick={() =>
                    requireAuth(
                      () => navigate(`/problem/${targetSlug}`),
                      `Please sign in with your Google account first to solve "${p.title}".`
                    )
                  }
                  className="w-full flex justify-between items-center text-left p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-red-500 transition hover:scale-[1.005] cursor-pointer shadow-md hover:shadow-red-500/10"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {p.isSolved ? (
                      <span title="Solved">
                        <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-base sm:text-lg font-semibold text-white truncate block">
                        {p.title?.replace(/\.+$/, '') || p.title}
                      </span>
                      <span className="inline-block text-xs text-zinc-400 mt-0.5 font-medium">
                        {p.topic}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                        p.difficulty === 'Easy'
                          ? 'bg-teal-500/10 text-[#00b8a3] border-teal-500/20'
                          : p.difficulty === 'Medium'
                          ? 'bg-amber-500/10 text-[#ffc01e] border-amber-500/20'
                          : 'bg-rose-500/10 text-[#ef476f] border-rose-500/20'
                      }`}
                    >
                      {p.difficulty}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cursor Pagination Controls */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-zinc-800 text-sm text-zinc-400">
          <button
            type="button"
            disabled={cursorHistory.length === 0}
            onClick={handlePrevPage}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <span className="text-xs text-zinc-500 font-mono">
            Showing {problems.length} items
          </span>

          <button
            type="button"
            disabled={!nextCursor}
            onClick={handleNextPage}
            className="flex items-center gap-1 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}
