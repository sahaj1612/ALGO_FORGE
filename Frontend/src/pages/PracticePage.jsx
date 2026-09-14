import { motion as Motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";

export default function Practice() {
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState({
    problemsAvailable: 3,
    currentStreak: "0 Days",
    ranking: "Top 0%",
  });
  const navigate = useNavigate();
  const { requireAuth, user } = useAuth();

  useEffect(() => {
    fetch("http://localhost:5000/api/problems")
      .then(res => res.json())
      .then(data => {
        setProblems(Array.isArray(data) ? data : []);
      })
      .catch(() => {});

    const token = localStorage.getItem("token");
    const tzOffset = new Date().getTimezoneOffset();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`http://localhost:5000/api/user/stats?tzOffset=${tzOffset}`, { headers })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) {
          setStats({
            problemsAvailable: data.problemsAvailable ?? 3,
            currentStreak: data.streakText || `${data.currentStreak || 0} Days`,
            ranking: data.ranking || "Top 0%",
          });
        }
      })
      .catch(() => {});
  }, [user]);

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />
      <main className="px-10 py-10">
        {/* PAGE TITLE */}
        <Motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-red-500 mb-8"
        >
          Practice Dashboard
        </Motion.h1>

        {/* STATS */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {[
            {
              label: "Problems Available",
              value: stats.problemsAvailable || problems.length || 3,
            },
            { label: "Current Streak", value: stats.currentStreak },
            { label: "Ranking", value: stats.ranking },
          ].map((item, i) => (
            <div
              key={i}
              className="p-6 bg-zinc-900 border border-red-900/30 
              rounded-2xl transition-all duration-300 
              hover:scale-105 hover:shadow-lg hover:border-red-500"
            >
              <p className="text-zinc-400">{item.label}</p>
              <h2 className="text-2xl font-bold text-red-500 mt-2">
                {item.value}
              </h2>
            </div>
          ))}
        </div>

        {/* TOPICS */}
        <h2 className="text-2xl font-semibold mb-6 text-red-500">
          Choose Topic
        </h2>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { name: "Arrays", id: "arrays" },
            { name: "Linked List", id: "linkedlist" },
            { name: "Stack", id: "stack" },
            { name: "Queue", id: "queue" },
            { name: "Trees", id: "trees" },
            { name: "Graphs", id: "graphs" },
            { name: "Dynamic Programming", id: "dynamicprogramming" },
            { name: "Binary Search", id: "binarysearch" },
          ].map((topic, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                requireAuth(
                  () => navigate(`/topic/${topic.id}`),
                  `Please sign in with your Google account first to practice ${topic.name} problems.`
                )
              }
              className="p-6 bg-zinc-900 border border-red-900/30 
              rounded-2xl cursor-pointer text-left
              transition-all duration-300 
              hover:scale-105 hover:border-red-500"
            >
              <h3 className="font-semibold">{topic.name}</h3>
            </button>
          ))}
        </div>

        {/* RECOMMENDED */}
        <h2 className="text-2xl font-semibold mt-16 mb-6 text-red-500">
          Recommended For You
        </h2>

        <div className="space-y-4">
          {[
            {
              title: "Find the maximum element in an array",
              difficulty: "Easy",
              isInteractive: true,
              id: "69bd041c0669b885ce198b33",
              keyword: "maximum",
            },
            {
              title: "Detect cycle in linked list",
              difficulty: "Medium",
              isInteractive: true,
              id: "69bd041c0669b885ce198b34",
              keyword: "cycle",
            },
            {
              title: "Dijkstra's Algorithm",
              difficulty: "Hard",
              isInteractive: true,
              id: "69bd041c0669b885ce198b35",
              keyword: "dijkstra",
            },
          ].map((item, index) => {
            const matchedProblem = problems.find(
              p =>
                p.title.toLowerCase().includes(item.keyword) ||
                p.title.toLowerCase() === item.title.toLowerCase()
            );
            const targetId = matchedProblem?._id || item.id;

            return (
              <div
                key={index}
                onClick={() => {
                  if (item.isInteractive) {
                    requireAuth(
                      () => navigate(`/problem/${targetId}`),
                      `Please sign in with your Google account first to solve "${item.title}".`
                    );
                  }
                }}
                className={`flex justify-between items-center p-5 
                bg-zinc-900/90 border border-red-900/30 
                rounded-2xl transition-all duration-300 ease-in-out
                ${
                  item.isInteractive
                    ? 'cursor-pointer hover:scale-[1.01] hover:border-red-500 hover:shadow-lg hover:shadow-red-500/10'
                    : 'hover:border-red-500/60'
                }`}
              >
                <span className="text-base sm:text-lg text-zinc-100 font-medium">
                  {item.title?.replace(/\.+$/, '') || item.title}
                </span>

                <span
                  className={`px-4 py-1 rounded-full text-sm font-semibold tracking-wide ${
                    item.difficulty === "Easy"
                      ? "bg-green-900/80 text-green-400 border border-green-700/40"
                      : item.difficulty === "Medium"
                      ? "bg-yellow-900/80 text-yellow-400 border border-yellow-700/40"
                      : "bg-red-900/80 text-red-400 border border-red-700/40"
                  }`}
                >
                  {item.difficulty}
                </span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
