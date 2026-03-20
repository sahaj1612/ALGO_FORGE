import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Code2 } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, document.title, "/dashboard");
    }

    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      fetch("http://localhost:5000/api/profile", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => setUser(data))
        .catch((err) => console.log(err));
    }
  }, []);

  // 🔥 Mock Stats (Replace later with backend data)
  const stats = {
    totalSolved: 0,
    totalSubmissions: 100,
    easy: 0,
    medium: 0,
    hard: 0,
  };

  const accuracy = Math.round(
    (stats.totalSolved / stats.totalSubmissions) * 100
  );

  const easyPercent = (stats.easy / stats.totalSolved) * 100;
  const mediumPercent = (stats.medium / stats.totalSolved) * 100;
  const hardPercent = (stats.hard / stats.totalSolved) * 100;

  return (
    <div className="min-h-screen bg-black text-white px-8 py-10">

{/* HEADER */}
<div className="flex items-center justify-between mb-12">

  {/* LEFT - LOGO */}
  <div
    onClick={() => navigate("/")}
    className="flex items-center gap-2 text-2xl font-bold text-red-500 cursor-pointer hover:scale-105 transition"
  >
    <Code2 /> AlgoForge
  </div>

  {/* RIGHT - PROFILE + BACK BUTTON */}
  <div className="flex items-center gap-6">


    {user && (
      <div className="flex items-center gap-3">
        <img
          src={user.picture}
          alt="profile"
          className="w-11 h-11 rounded-full border-2 border-red-500 hover:scale-110 transition duration-300 cursor-pointer"
          onClick={() => navigate("/profile")}
        />
        <div className="hidden md:block">
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-zinc-400">{user.email}</p>
        </div>
      </div>
    )}

  </div>



</div>
      {/* STATS SECTION */}
      <div className="grid lg:grid-cols-2 gap-12">

        {/* ACCURACY CIRCLE */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-zinc-900 p-10 rounded-2xl border border-zinc-800
          hover:border-red-500 hover:shadow-lg hover:shadow-red-900/40
          transition-all duration-300"
        >
          <h2 className="text-xl font-bold mb-8">Overall Accuracy</h2>

          <div className="flex flex-col items-center justify-center">

            <div className="relative w-44 h-44">
              <svg className="transform -rotate-90 w-44 h-44">
                <circle
                  cx="88"
                  cy="88"
                  r="75"
                  stroke="#27272a"
                  strokeWidth="12"
                  fill="transparent"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="75"
                  stroke="#ef4444"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 75}
                  strokeDashoffset={
                    2 * Math.PI * 75 * (1 - accuracy / 100)
                  }
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold">
                {accuracy}%
              </div>
            </div>

            <p className="text-zinc-400 mt-6">
              {stats.totalSolved} / {stats.totalSubmissions} Accepted
            </p>

          </div>
        </motion.div>

        {/* DIFFICULTY BREAKDOWN */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-zinc-900 p-10 rounded-2xl border border-zinc-800
          hover:border-red-500 hover:shadow-lg hover:shadow-red-900/40
          transition-all duration-300"
        >
          <h2 className="text-xl font-bold mb-8">Problem Breakdown</h2>

          <div className="space-y-8">

            {/* EASY */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-green-400 font-semibold">Easy</span>
                <span>{stats.easy}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${easyPercent}%` }}
                />
              </div>
            </div>

            {/* MEDIUM */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-yellow-400 font-semibold">Medium</span>
                <span>{stats.medium}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3">
                <div
                  className="bg-yellow-500 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${mediumPercent}%` }}
                />
              </div>
            </div>

            {/* HARD */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-red-500 font-semibold">Hard</span>
                <span>{stats.hard}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${hardPercent}%` }}
                />
              </div>
            </div>

          </div>
        </motion.div>
      </div>

    </div>
  );
}