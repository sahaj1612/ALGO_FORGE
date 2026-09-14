import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";
import "../index.css";

export default function HomePage() {
  const navigate = useNavigate();
  const { requireAuth } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center mt-24 px-6">
        <Motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl font-extrabold leading-tight text-red-500"
        >
          Master Data Structures & Algorithms
        </Motion.h1>

        <Motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-6 text-lg text-zinc-400 max-w-2xl"
        >
          Practice coding problems, compete in contests, and get interview ready for top tech companies.
        </Motion.p>

        <Motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex gap-6 mt-10"
        >
          <button
            onClick={() =>
              requireAuth(
                () => navigate("/practice"),
                "Please sign in with your Google account first to start practicing problems."
              )
            }
            className="px-6 py-3 rounded-2xl border border-red-500 text-red-500 font-semibold
            transition-all duration-300 hover:scale-105 hover:bg-red-600 hover:text-white cursor-pointer"
          >
            Start Practicing
          </button>

          <button
            type="button"
            onClick={() =>
              requireAuth(
                () => navigate("/explore"),
                "Please sign in with your Google account first to explore all problems."
              )
            }
            className="px-6 py-3 rounded-2xl border border-red-500 text-red-500 font-semibold
            transition-all duration-300 hover:scale-105 hover:bg-red-600 hover:text-white cursor-pointer"
          >
            Explore Problems
          </button>
        </Motion.div>
      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-8 px-10 mt-32 pb-24">
        {[
          { title: "Curated Questions", desc: "Company-wise structured problems for interviews" },
          { title: "Real Contests", desc: "Weekly contests with live rankings" },
          { title: "Code Playground", desc: "Run code in multiple languages instantly" },
        ].map((card, i) => (
          <Motion.div
            key={i}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{
              y: -10,
              scale: 1.05,
            }}
            transition={{
              stiffness: 300,
            }}
            className="p-8 rounded-2xl bg-zinc-900 border border-red-900/30
                       shadow-md hover:shadow-red-500/20"
          >
            <h3 className="text-2xl font-bold text-red-500">{card.title}</h3>
            <p className="mt-4 text-zinc-400">{card.desc}</p>
          </Motion.div>
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
