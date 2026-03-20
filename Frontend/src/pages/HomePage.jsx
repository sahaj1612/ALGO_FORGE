import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Code2 } from "lucide-react";
import { useEffect, useState } from "react";
import "../index.css";

export default function HomePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (token) {
        localStorage.setItem("token", token);

        // Remove token from URL
        window.history.replaceState({}, document.title, "/");

        // Redirect to homepage
        navigate("/");
      }
    }, []);
    
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };
  return (
    <div className="min-h-screen bg-black text-white">

      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-red-900/40">

        <button
        onClick={() => navigate("/")}
        className="flex items-center duration-300 hover:scale-105 gap-2 text-2xl font-bold text-red-500">
          <Code2 /> AlgoForge
        </button>

        <div className="flex items-center gap-6">

          <button className="font-medium duration-300 hover:scale-105 hover:text-red-500">
            Discuss
          </button>

          <button className="font-medium duration-300 hover:scale-105 hover:text-red-500">
            Contest
          </button>

          <button className="font-medium duration-300 hover:scale-105 hover:text-red-500">
            Leaderboard
          </button>

      {user ? (
        <div className="flex items-center gap-4">

          <img
            src={user.picture}
            alt="profile"
            onClick={() => navigate("/profile")}
            className="w-10 h-10 rounded-full cursor-pointer border-2 border-red-500 hover:scale-105 transition"
          />

          <button
            onClick={handleLogout}
            className="px-6 py-3 rounded-2xl border border-red-500 text-red-500
            transition-all duration-300 hover:scale-105 hover:bg-red-600 hover:text-white"
          >
            Logout
          </button>

        </div>
      ) : (
        <button
          className="px-4 py-2 rounded-2xl border border-red-500 text-red-500
          transition-all duration-300 hover:scale-105 hover:bg-red-600 hover:text-white"
          onClick={() => {
            window.location.href = "http://localhost:5000/auth/google";
          }}
        >
          Login
        </button>
      )}

        </div>
      </nav>

      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center mt-24 px-6">

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl font-extrabold leading-tight text-red-500"
        >
          Master Data Structures & Algorithms
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-6 text-lg text-zinc-400 max-w-2xl"
        >
          Practice coding problems, compete in contests, and get interview ready for top tech companies.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex gap-6 mt-10"
        >
          <button
            onClick={() => navigate("/practice")}
            className="px-6 py-3 rounded-2xl border border-red-500 text-red-500
            transition-all duration-300 hover:scale-105 hover:bg-red-600 hover:text-white"
          >
            Start Practicing
          </button>

          <button
            type="button"
            onClick={() => navigate("/explore")}
            className="px-6 py-3 rounded-2xl border border-red-500 text-red-500
            transition-all duration-300 hover:scale-105 hover:bg-red-600 hover:text-white"
          >
            Explore Problems
          </button>

        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-8 px-10 mt-32 pb-24">
  {[
    { title: "Curated Questions", desc: "Company-wise structured problems for interviews" },
    { title: "Real Contests", desc: "Weekly contests with live rankings" },
    { title: "Code Playground", desc: "Run code in multiple languages instantly" },
  ].map((card, i) => (
    <motion.div
      key={i}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -10,          // move up
        scale: 1.05,     // slight zoom
      }}
      transition={{ 
        //delay: i * 0.2,
        //type: "spring",
        stiffness: 300 
      }}
      className="p-8 rounded-2xl bg-zinc-900 border border-red-900/30
                 shadow-md hover:shadow-red-500/20"
    >
      <h3 className="text-2xl font-bold text-red-500">
        {card.title}
      </h3>
      <p className="mt-4 text-zinc-400">{card.desc}</p>
    </motion.div>
  ))}
</section>

      {/* FOOTER */}
      <footer className="text-center py-6 border-t border-red-900/40">
        <p className="text-zinc-500">
          © 2026 Sahaj — AlgoCode. Master the Algorithm.
        </p>
      </footer>

    </div>
  );
}