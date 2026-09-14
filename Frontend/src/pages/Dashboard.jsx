import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, CheckCircle2, Code2, Flame, History } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import SolvedStatsCard from '../components/SolvedStatsCard';

const API = 'http://localhost:5000/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const receivedToken = new URLSearchParams(window.location.search).get('token');
    if (receivedToken) {
      localStorage.setItem('token', receivedToken);
      window.history.replaceState({}, '', '/dashboard');
    }

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/submissions`, { headers })
        .then(response => (response.ok ? response.json() : []))
        .catch(() => []),
      fetch(`${API}/problems`)
        .then(response => (response.ok ? response.json() : []))
        .catch(() => []),
    ])
      .then(([subsData, probsData]) => {
        setSubmissions(Array.isArray(subsData) ? subsData : []);
        setProblems(Array.isArray(probsData) ? probsData : []);
      })
      .catch(err => {
        console.error('Error fetching dashboard data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  const accepted = submissions.filter(
    submission => submission.status?.toLowerCase() === 'accepted'
  );

  const solvedIds = new Set(
    accepted
      .map(s => String(s.problemId?._id || s.problemId || ''))
      .filter(Boolean)
  );

  const attemptedIds = new Set(
    submissions
      .map(s => String(s.problemId?._id || s.problemId || ''))
      .filter(Boolean)
  );

  const attemptingCount = [...attemptedIds].filter(id => !solvedIds.has(id)).length;

  const totalEasy = problems.filter(p => p.difficulty === 'Easy').length;
  const totalMed = problems.filter(p => p.difficulty === 'Medium').length;
  const totalHard = problems.filter(p => p.difficulty === 'Hard').length;
  const totalProblems = problems.length || (totalEasy + totalMed + totalHard);

  const solvedEasy = new Set(
    accepted
      .filter(s => {
        const diff =
          s.problemId?.difficulty ||
          problems.find(p => String(p._id) === String(s.problemId?._id || s.problemId))?.difficulty;
        return diff === 'Easy';
      })
      .map(s => String(s.problemId?._id || s.problemId))
  ).size;

  const solvedMed = new Set(
    accepted
      .filter(s => {
        const diff =
          s.problemId?.difficulty ||
          problems.find(p => String(p._id) === String(s.problemId?._id || s.problemId))?.difficulty;
        return diff === 'Medium';
      })
      .map(s => String(s.problemId?._id || s.problemId))
  ).size;

  const solvedHard = new Set(
    accepted
      .filter(s => {
        const diff =
          s.problemId?.difficulty ||
          problems.find(p => String(p._id) === String(s.problemId?._id || s.problemId))?.difficulty;
        return diff === 'Hard';
      })
      .map(s => String(s.problemId?._id || s.problemId))
  ).size;

  const totalSolved = solvedIds.size;
  const accuracy = submissions.length
    ? Math.round((accepted.length / submissions.length) * 100)
    : 0;

  const solvedStats = {
    easy: { solved: solvedEasy, total: totalEasy },
    medium: { solved: solvedMed, total: totalMed },
    hard: { solved: solvedHard, total: totalHard },
    totalSolved,
    totalProblems,
    attempting: attemptingCount,
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-500 selection:text-white">
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
        {/* Progress & Overview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Main Solved Gauge Feature Card */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3.5 flex items-center gap-2 h-6">
              <CheckCircle2 size={16} className="text-red-500" />
              Problem Solving Stats
            </h2>
            <div className="flex-1 flex">
              <SolvedStatsCard solvedStats={solvedStats} />
            </div>
          </div>

          {/* Key Metrics Stats Grid */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3.5 flex items-center gap-2 h-6">
              <Award size={16} className="text-red-500" />
              Overall Performance
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Total Submissions
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">{submissions.length}</p>
                  <p className="text-xs text-zinc-500 mt-1">Across all difficulties</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/40 flex items-center justify-center text-zinc-300">
                  <Code2 size={24} />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Acceptance Rate
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-400">{accuracy}%</p>
                  <p className="text-xs text-zinc-500 mt-1">{accepted.length} accepted runs</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Problems Solved
                  </p>
                  <p className="mt-2 text-2xl font-bold text-red-500">{totalSolved}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {totalProblems > 0 ? `${Math.round((totalSolved / totalProblems) * 100)}% of platform` : 'Platform total'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <Flame size={24} />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Currently Attempting
                  </p>
                  <p className="mt-2 text-2xl font-bold text-amber-400">{attemptingCount}</p>
                  <p className="text-xs text-zinc-500 mt-1">Unsolved submitted problems</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <History size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Submissions Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <History size={20} className="text-red-500" />
              Recent Submissions
            </h2>
            {submissions.length > 0 && (
              <span className="text-xs text-zinc-500">
                Showing latest {Math.min(10, submissions.length)}
              </span>
            )}
          </div>

          {loading ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-500">
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
              <p className="text-zinc-400 text-base">No submissions yet!</p>
              <p className="text-zinc-600 text-sm mt-1">
                Start solving problems to track your progress and performance.
              </p>
              <button
                onClick={() => navigate('/explore')}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-red-500 transition"
              >
                Start Practicing
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-lg">
              <div className="divide-y divide-zinc-800/60">
                {submissions.slice(0, 10).map(submission => {
                  const isAccepted = submission.status?.toLowerCase() === 'accepted';
                  const problemTitle =
                    submission.problemId?.title ||
                    problems.find(p => String(p._id) === String(submission.problemId?._id || submission.problemId))?.title ||
                    'Deleted Problem';
                  const problemDiff =
                    submission.problemId?.difficulty ||
                    problems.find(p => String(p._id) === String(submission.problemId?._id || submission.problemId))?.difficulty;

                  return (
                    <div
                      key={submission._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 hover:bg-zinc-800/40 transition gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${isAccepted ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-400'
                            }`}
                        />
                        <span className="font-semibold text-zinc-200">{problemTitle}</span>
                        {problemDiff && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${problemDiff === 'Easy'
                                ? 'bg-teal-500/10 text-[#00b8a3]'
                                : problemDiff === 'Medium'
                                  ? 'bg-amber-500/10 text-[#ffc01e]'
                                  : 'bg-rose-500/10 text-[#ef476f]'
                              }`}
                          >
                            {problemDiff}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <span
                          className={`font-semibold capitalize ${isAccepted ? 'text-emerald-400' : 'text-red-400'
                            }`}
                        >
                          {submission.status.replaceAll('_', ' ')}
                        </span>
                        <span>·</span>
                        <span>{submission.time != null ? `${submission.time} ms` : '— ms'}</span>
                        <span>·</span>
                        <span>{submission.memory != null ? `${submission.memory} MB` : '— MB'}</span>
                        {submission.createdAt && (
                          <>
                            <span>·</span>
                            <span className="text-zinc-500 text-xs">
                              {new Date(submission.createdAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
