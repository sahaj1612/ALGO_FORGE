import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  FileText,
  Lightbulb,
  History,
  Tag,
  Lock,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Share2,
  Code,
  AlignLeft,
  RotateCcw,
  Maximize2,
  CheckSquare,
  Terminal,
  Play,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  BookOpen,
  Save,
  Check
} from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import { useAuth } from '../context/AuthContext';
import { VERDICTS, isTerminalVerdict } from '../constants/verdicts';

const API = 'http://localhost:5000/api';

function getStarterCode(p, lang) {
  if (p?.starterCode) {
    if (typeof p.starterCode === 'object') {
      const code = p.starterCode[lang] || (typeof p.starterCode.get === 'function' ? p.starterCode.get(lang) : null);
      if (code) return code;
    }
  }
  const genericDefaults = {
    javascript: "function solve(nums) {\n  // Write your solution here\n}",
    python: "class Solution:\n    def solve(self, nums):\n        # Write your solution here\n        pass",
    java: "class Solution {\n    public int solve(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}",
    cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Write your solution here\n        return 0;\n    }\n};",
    c: "#include <stdio.h>\n\nint solve(int* nums, int numsSize) {\n    // Write your solution here\n    return 0;\n}"
  };
  return genericDefaults[lang] || genericDefaults.javascript;
}

export default function ProblemSolve() {
  const { id } = useParams();
  const { user } = useAuth();

  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState(() => user?.preferredLanguage || 'javascript');
  const [code, setCode] = useState('');

  // Left panel navigation tabs: 'description' | 'editorial' | 'notes' | 'submissions'
  const [activeLeftTab, setActiveLeftTab] = useState('description');

  // Testcase & Output states
  const [activeBottomTab, setActiveBottomTab] = useState('testcase');
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [customTestcases, setCustomTestcases] = useState(['[1, 3, 1, 7]', '[5, 9, 1, 3]']);
  const [results, setResults] = useState([]);
  const [verdict, setVerdict] = useState('');
  const [busy, setBusy] = useState(false);
  const [executionMetrics, setExecutionMetrics] = useState(null);

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Submissions history for this problem
  const [problemSubmissions, setProblemSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Social & Learning states
  const [likes, setLikes] = useState(142);
  const [hasLiked, setHasLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const editorRef = useRef(null);

  // Poll controller ref to avoid duplicate polling loops
  const pollTimerRef = useRef(null);

  const startPolling = (submissionId, token) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    setBusy(true);
    setActiveBottomTab('result');
    setVerdict('running');

    const headers = { Authorization: `Bearer ${token}` };
    const startTime = Date.now();
    let pollInterval = 1000;

    const poll = async () => {
      // 60-second timeout check
      if (Date.now() - startTime > 60000) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setVerdict(VERDICTS.TIME_LIMIT);
        setBusy(false);
        sessionStorage.removeItem(`pending_sub_${id}`);
        return;
      }

      try {
        const statusRes = await fetch(`${API}/submissions/${submissionId}`, { headers });
        if (!statusRes.ok) throw new Error('Submission fetch error');
        const statusData = await statusRes.json();

        setVerdict(statusData.status);

        if (statusData.isTerminal || isTerminalVerdict(statusData.status)) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setResults(statusData.results || []);
          setExecutionMetrics({
            time: statusData.time,
            memory: statusData.memory
          });
          setBusy(false);
          sessionStorage.removeItem(`pending_sub_${id}`);
          fetchProblemSubmissions();
        }
      } catch {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setBusy(false);
        sessionStorage.removeItem(`pending_sub_${id}`);
      }
    };

    pollTimerRef.current = setInterval(poll, pollInterval);
  };

  const fetchProblemSubmissions = () => {
    const token = localStorage.getItem('token');
    if (!token || !problem?._id) return;
    setLoadingSubmissions(true);
    fetch(`${API}/submissions?problemId=${problem._id}&limit=20`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => (r.ok ? r.json() : { items: [] }))
      .then(data => setProblemSubmissions(data.items || []))
      .catch(() => setProblemSubmissions([]))
      .finally(() => setLoadingSubmissions(false));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const problemIdentifier = id || 'find-maximum-element';

    fetch(`${API}/problems/${problemIdentifier}`, { headers })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(p => {
        if (p && (p._id || p.title)) {
          setProblem(p);
          const defaultStarter = getStarterCode(p, language);
          const saved = localStorage.getItem(`draft:${p.slug || p._id}:${language}`);
          setCode(saved || defaultStarter);

          if (p.testcases && p.testcases.length > 0) {
            setCustomTestcases(
              p.testcases.map(tc =>
                typeof tc.input === 'object' ? JSON.stringify(tc.input) : String(tc.input)
              )
            );
          }

          // Log viewed problem
          if (token && p._id) {
            fetch(`${API}/learning/viewed/${p._id}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {});

            // Fetch note
            fetch(`${API}/learning/notes/${p._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
              .then(r => (r.ok ? r.json() : null))
              .then(d => {
                if (d && d.content) setNoteContent(d.content);
              })
              .catch(() => {});

            // Fetch bookmarks
            fetch(`${API}/learning/bookmarks`, {
              headers: { Authorization: `Bearer ${token}` }
            })
              .then(r => (r.ok ? r.json() : []))
              .then(bms => {
                const isBm = Array.isArray(bms) && bms.some(b => (b._id || b) === p._id);
                setBookmarked(isBm);
              })
              .catch(() => {});
          }

          // Browser refresh state recovery (Phase 2 Definition of Done)
          const pendingSub = sessionStorage.getItem(`pending_sub_${p.slug || p._id || id}`);
          if (pendingSub && token) {
            startPolling(pendingSub, token);
          }
        }
      })
      .catch(() => {});

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (activeLeftTab === 'submissions' && problem?._id) {
      fetchProblemSubmissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeftTab, problem]);

  useEffect(() => {
    if (code && problem) {
      localStorage.setItem(`draft:${problem.slug || problem._id || id}:${language}`, code);
    }
  }, [code, id, language, problem]);

  const handleLanguageChange = newLang => {
    setLanguage(newLang);
    const saved = localStorage.getItem(`draft:${problem?.slug || problem?._id || id}:${newLang}`);
    const defaultStarter = getStarterCode(problem, newLang);
    setCode(saved || defaultStarter);
  };

  const handleResetCode = () => {
    const defaultCode = getStarterCode(problem, language);
    setCode(defaultCode);
    if (editorRef.current) {
      editorRef.current.setValue(defaultCode);
    }
  };

  const toggleBookmark = async () => {
    const token = localStorage.getItem('token');
    if (!token || !problem?._id) return;
    try {
      const res = await fetch(`${API}/learning/bookmarks/${problem._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBookmarked(Boolean(data.bookmarked));
    } catch {}
  };

  const saveNote = async () => {
    const token = localStorage.getItem('token');
    if (!token || !problem?._id) return;
    setSavingNote(true);
    try {
      await fetch(`${API}/learning/notes/${problem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: noteContent })
      });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2500);
    } catch {}
    finally {
      setSavingNote(false);
    }
  };

  const handleRunCode = async () => {
    setBusy(true);
    setActiveBottomTab('result');
    setVerdict(VERDICTS.RUNNING);

    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    try {
      const casesToSend = customTestcases.slice(0, 5).map(tc => {
        try {
          return JSON.parse(tc);
        } catch {
          return tc;
        }
      });

      const response = await fetch(`${API}/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code,
          problemId: problem?.slug || problem?._id || id,
          language,
          testcases: casesToSend,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Execution error');

      setResults(data.results || []);
      const anyFailed = data.results?.some(r => r.status !== 'passed' && r.status !== 'accepted');
      setVerdict(anyFailed ? VERDICTS.WRONG_ANSWER : VERDICTS.ACCEPTED);
    } catch (err) {
      setVerdict(VERDICTS.RUNTIME_ERROR);
      setResults([
        {
          ordinal: 1,
          status: 'error',
          input: customTestcases[activeCaseIndex] || '',
          expected: '',
          got: '',
          error: err.message || 'Execution failed',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitCode = async () => {
    setBusy(true);
    setActiveBottomTab('result');
    setVerdict(VERDICTS.PENDING);
    setResults([]);

    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    try {
      const response = await fetch(`${API}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code,
          problemId: problem?.slug || problem?._id || id,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Submission failed');

      const problemKey = problem?.slug || problem?._id || id;
      sessionStorage.setItem(`pending_sub_${problemKey}`, data.submissionId);

      startPolling(data.submissionId, token);
    } catch (err) {
      setVerdict(VERDICTS.SERVER_ERROR);
      setResults([
        {
          ordinal: 1,
          status: 'error',
          error: err.message || 'Could not submit solution to judge',
        },
      ]);
      setBusy(false);
    }
  };

  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme('algoforge-grey', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#262626',
        'editorGutter.background': '#262626',
        'editor.lineHighlightBackground': '#303030',
        'editorLineNumber.foreground': '#71717a',
        'editorLineNumber.activeForeground': '#e4e4e7',
      },
    });
  };

  const getMonacoLang = () => {
    if (language === 'javascript') return 'javascript';
    if (language === 'c' || language === 'cpp') return 'cpp';
    if (language === 'java') return 'java';
    return 'python';
  };

  const activeProblem = problem || {
    title: 'Loading Problem...',
    difficulty: 'Easy',
    topic: 'Arrays',
    description: 'Loading problem contract and constraints...',
    constraints: '',
    examples: []
  };

  return (
    <div className="flex flex-col h-screen bg-black text-zinc-100 selection:bg-red-500 selection:text-white overflow-hidden font-sans">
      <SiteHeader />

      {/* Main 2-Panel Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-2 p-2 bg-black overflow-hidden">
        
        {/* LEFT PANEL */}
        <div className="flex flex-col bg-black rounded-xl border border-zinc-900 overflow-hidden shadow-2xl">
          {/* Top Tabs Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#0a0a0a] border-b border-zinc-900 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveLeftTab('description')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-semibold ${
                  activeLeftTab === 'description' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText size={14} className="text-blue-400" />
                <span>Description</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('editorial')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-semibold ${
                  activeLeftTab === 'editorial' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <BookOpen size={14} className="text-amber-400" />
                <span>Editorial</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('notes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-semibold ${
                  activeLeftTab === 'notes' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Lightbulb size={14} className="text-emerald-400" />
                <span>Notes</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('submissions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-semibold ${
                  activeLeftTab === 'submissions' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <History size={14} className="text-rose-400" />
                <span>Submissions</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-zinc-400">
              <button className="hover:text-white p-1 rounded hover:bg-zinc-800" title="Fullscreen">
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          {/* Left Panel Content */}
          <div className="flex-1 overflow-y-auto p-6 text-sm text-zinc-300 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800 bg-black">
            {activeLeftTab === 'description' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    {activeProblem.title?.replace(/\.+$/, '') || activeProblem.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2 mt-3.5">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        activeProblem.difficulty === 'Easy'
                          ? 'bg-teal-500/10 text-[#00b8a3] border-teal-500/30'
                          : activeProblem.difficulty === 'Medium'
                          ? 'bg-amber-500/10 text-[#ffc01e] border-amber-500/30'
                          : 'bg-rose-500/10 text-[#ef476f] border-rose-500/30'
                      }`}
                    >
                      {activeProblem.difficulty || 'Easy'}
                    </span>

                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#262626] border border-zinc-700/60 text-zinc-300 text-xs">
                      <Tag size={12} />
                      <span>{activeProblem.topic || 'Arrays'}</span>
                    </span>

                    <span className="text-xs text-zinc-500 font-mono">
                      v{activeProblem.version || 1}
                    </span>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {activeProblem.description}
                </div>

                {/* Examples */}
                {activeProblem.examples && activeProblem.examples.length > 0 && (
                  <div className="space-y-5">
                    {activeProblem.examples.map((ex, i) => (
                      <div key={i} className="space-y-2">
                        <p className="font-bold text-white text-sm">Example {i + 1}:</p>
                        <div className="bg-[#1e1e1e] border border-zinc-800 rounded-xl p-4 font-mono text-xs space-y-1.5 text-zinc-200">
                          <div>
                            <span className="text-zinc-400 font-semibold">Input: </span>
                            <span>{ex.input}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 font-semibold">Output: </span>
                            <span>{ex.output}</span>
                          </div>
                          {ex.explanation && (
                            <div className="pt-1 text-zinc-400 font-sans">
                              <span className="text-zinc-500 font-semibold font-mono">Explanation: </span>
                              {ex.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {activeProblem.constraints && (
                  <div className="space-y-2 pt-2">
                    <p className="font-bold text-white text-sm">Constraints:</p>
                    <div className="font-mono text-xs text-zinc-300 bg-[#1e1e1e] p-3.5 rounded-xl border border-zinc-800 whitespace-pre-wrap">
                      {activeProblem.constraints}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'editorial' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white">Editorial & Approach</h2>
                {activeProblem.editorial?.approach ? (
                  <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {activeProblem.editorial.approach}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-sm">
                    No full editorial published for this problem yet. Review the hints below.
                  </p>
                )}

                {activeProblem.editorial?.hints && activeProblem.editorial.hints.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-zinc-900">
                    <h3 className="font-semibold text-white">Hints</h3>
                    {activeProblem.editorial.hints.map((h, i) => (
                      <div key={i} className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-300">
                        <strong className="text-amber-400 mr-2">Hint {i + 1}:</strong> {h}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'notes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Your Notes</h2>
                  <button
                    onClick={saveNote}
                    disabled={savingNote}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition disabled:opacity-50"
                  >
                    {savingNote ? <Loader2 size={13} className="animate-spin" /> : noteSaved ? <Check size={13} /> : <Save size={13} />}
                    <span>{noteSaved ? 'Saved!' : 'Save Note'}</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-400">
                  Notes are stored securely in your account and persisted across sessions.
                </p>
                <textarea
                  rows={12}
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Jot down your key insights, edge cases, time complexity, or approach for this problem..."
                  className="w-full bg-[#1e1e1e] border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:border-red-500 focus:outline-none transition leading-relaxed"
                />
              </div>
            )}

            {activeLeftTab === 'submissions' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Your Submissions</h2>
                {loadingSubmissions ? (
                  <div className="py-8 text-center text-zinc-500">Loading submission records...</div>
                ) : problemSubmissions.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500">
                    No submissions recorded yet for this problem. Click Submit to record one!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {problemSubmissions.map(sub => (
                      <div
                        key={sub._id}
                        className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-bold capitalize ${
                              sub.status === 'accepted' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {sub.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-zinc-400 uppercase font-mono">{sub.language}</span>
                        </div>
                        <div className="flex items-center gap-4 text-zinc-500 font-mono">
                          <span>{sub.time != null ? `${sub.time} ms` : '—'}</span>
                          <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Left Footer Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0a0a] border-t border-zinc-900 text-xs text-zinc-400">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setLikes(prev => (hasLiked ? prev - 1 : prev + 1));
                  setHasLiked(!hasLiked);
                }}
                className={`flex items-center gap-1.5 transition ${
                  hasLiked ? 'text-blue-400 font-bold' : 'hover:text-zinc-200'
                }`}
              >
                <ThumbsUp size={14} />
                <span>{likes}</span>
              </button>

              <button
                onClick={toggleBookmark}
                title={bookmarked ? 'Remove Bookmark' : 'Bookmark Problem'}
                className={`flex items-center gap-1.5 transition ${bookmarked ? 'text-amber-400' : 'hover:text-zinc-200'}`}
              >
                <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
                <span>{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-400 text-xs">Docker Sandbox Online</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-col bg-[#262626] rounded-xl border border-zinc-800 overflow-hidden shadow-2xl">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1f1f1f] border-b border-zinc-800 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <Code size={14} />
                <span>Code</span>
              </span>

              {/* Supported Languages: JavaScript, Python, Java, C++, C */}
              <div className="relative">
                <select
                  value={language}
                  onChange={e => handleLanguageChange(e.target.value)}
                  className="bg-[#262626] border border-zinc-700/60 rounded-lg px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 cursor-pointer focus:outline-none"
                >
                  <option value="javascript">JavaScript (Node.js)</option>
                  <option value="python">Python 3</option>
                  <option value="java">Java 17</option>
                  <option value="cpp">C++ (GCC 17)</option>
                  <option value="c">C (GCC 11)</option>
                </select>
              </div>

              <div className="flex items-center gap-1 text-zinc-500 text-xs">
                <Lock size={11} />
                <span>Isolated Sandbox</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-zinc-400">
              <button
                onClick={() => {
                  if (editorRef.current) {
                    editorRef.current.getAction('editor.action.formatDocument')?.run();
                  }
                }}
                className="hover:text-white p-1 rounded hover:bg-zinc-800"
                title="Format Code"
              >
                <AlignLeft size={14} />
              </button>

              <button
                onClick={handleResetCode}
                className="hover:text-white p-1 rounded hover:bg-zinc-800"
                title="Reset Code"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Monaco Code Editor */}
          <div className="flex-1 min-h-[320px] relative bg-[#262626]">
            <Editor
              height="100%"
              language={getMonacoLang()}
              beforeMount={handleEditorWillMount}
              theme="algoforge-grey"
              value={code}
              onChange={val => setCode(val || '')}
              onMount={editor => {
                editorRef.current = editor;
              }}
              options={{
                fontSize: 13,
                fontFamily: "'Fira Code', monospace",
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                cursorBlinking: 'smooth',
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* Bottom Testcase & Results Terminal Panel */}
          <div className="border-t border-zinc-800 bg-[#1e1e1e] flex flex-col">
            {/* Tabs Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#1f1f1f] border-b border-zinc-800 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveBottomTab('testcase')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition font-medium ${
                    activeBottomTab === 'testcase'
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <CheckSquare size={14} className={activeBottomTab === 'testcase' ? 'text-emerald-400' : ''} />
                  <span>Testcase</span>
                </button>

                <button
                  onClick={() => setActiveBottomTab('result')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition font-medium ${
                    activeBottomTab === 'result'
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Terminal size={14} className={activeBottomTab === 'result' ? 'text-blue-400' : ''} />
                  <span>Test Result</span>
                </button>
              </div>

              {verdict && (
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {verdict === 'accepted' ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Accepted
                    </span>
                  ) : verdict === 'running' || verdict === 'pending' ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Loader2 size={13} className="animate-spin" /> Evaluating in Sandbox...
                    </span>
                  ) : verdict === 'compilation_error' ? (
                    <span className="text-rose-400 flex items-center gap-1">
                      <XCircle size={13} /> Compilation Error
                    </span>
                  ) : verdict === 'time_limit' ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <XCircle size={13} /> Time Limit Exceeded
                    </span>
                  ) : verdict === 'server_error' ? (
                    <span className="text-red-400 flex items-center gap-1">
                      <XCircle size={13} /> Server Error
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1">
                      <XCircle size={13} /> Wrong Answer
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 max-h-48 min-h-[120px] overflow-y-auto text-xs font-mono bg-[#222222]">
              {activeBottomTab === 'testcase' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {customTestcases.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveCaseIndex(idx)}
                        className={`px-3 py-1 rounded-lg transition font-semibold ${
                          activeCaseIndex === idx
                            ? 'bg-zinc-700 text-white shadow-sm border border-zinc-600'
                            : 'bg-[#262626] text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/60'
                        }`}
                      >
                        Case {idx + 1}
                      </button>
                    ))}
                    {customTestcases.length < 5 && (
                      <button
                        onClick={() => {
                          setCustomTestcases([...customTestcases, '[2, 8, 4, 1]']);
                          setActiveCaseIndex(customTestcases.length);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#262626] text-zinc-300 hover:bg-zinc-700 hover:text-white transition border border-zinc-700/60"
                        title="Add custom case (max 5)"
                      >
                        +
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-400 text-xs font-sans">Input Data:</label>
                    <input
                      type="text"
                      value={customTestcases[activeCaseIndex] || ''}
                      onChange={e => {
                        const updated = [...customTestcases];
                        updated[activeCaseIndex] = e.target.value;
                        setCustomTestcases(updated);
                      }}
                      className="w-full bg-[#262626] border border-zinc-700/60 rounded-xl p-2.5 text-zinc-200 focus:border-zinc-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {busy ? (
                    <div className="flex items-center justify-center py-6 text-zinc-400 gap-2 font-sans">
                      <Loader2 size={18} className="animate-spin text-red-500" />
                      <span>Judging execution in Docker sandbox...</span>
                    </div>
                  ) : results.length === 0 ? (
                    <p className="text-zinc-500 font-sans">Click &quot;Run&quot; or &quot;Submit&quot; to test your code.</p>
                  ) : (
                    <div className="space-y-2">
                      {executionMetrics && (
                        <div className="flex items-center gap-4 text-zinc-400 pb-1 text-[11px] font-sans">
                          <span>Runtime: <strong className="text-white">{executionMetrics.time} ms</strong></span>
                        </div>
                      )}

                      {results.map((res, i) => (
                        <div key={i} className="bg-[#262626] p-3 rounded-xl border border-zinc-700/60 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">Case {res.ordinal || i + 1}</span>
                            <span
                              className={`font-semibold ${
                                res.status === 'passed' || res.status === 'accepted' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {res.status === 'passed' || res.status === 'accepted' ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          {res.input && (
                            <div className="text-zinc-300">
                              <span className="text-zinc-400">Input: </span>
                              {typeof res.input === 'object' ? JSON.stringify(res.input) : res.input}
                            </div>
                          )}
                          {res.expected != null && (
                            <div className="text-zinc-300">
                              <span className="text-zinc-400">Expected: </span>
                              {res.expected}
                            </div>
                          )}
                          {res.got != null && (
                            <div className="text-zinc-300">
                              <span className="text-zinc-400">Output: </span>
                              {res.got}
                            </div>
                          )}
                          {res.error && (
                            <div className="mt-2 text-rose-400 bg-rose-950/30 p-2 rounded-lg border border-rose-900/50 font-mono text-[11px] whitespace-pre-wrap">
                              {res.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1f1f1f] border-t border-zinc-800">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="font-mono text-zinc-500">
                  {language.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={busy}
                  onClick={handleRunCode}
                  className="flex items-center gap-1.5 rounded-lg bg-[#262626] border border-zinc-700/60 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition disabled:opacity-50 active:scale-95 shadow-sm"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Run</span>
                </button>

                <button
                  disabled={busy}
                  onClick={handleSubmitCode}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50 active:scale-95 shadow-lg shadow-emerald-600/20"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Submit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
