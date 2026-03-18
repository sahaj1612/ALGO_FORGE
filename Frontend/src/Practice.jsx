import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Practice() {
  const [problems, setProblems] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // 🔥 Fetch Problems From Backend
  useEffect(() => {
    fetch("http://localhost:5000/api/problems")
      .then((res) => res.json())
      .then((data) => setProblems(data))
      .catch((err) => console.error(err));
  }, []);

  // 🔎 Filter Problems Based On Search
  const filteredProblems = problems.filter((problem) =>
    problem.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white px-10 py-10">

      {/* PAGE TITLE */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold text-red-500 mb-8"
      >
        Practice Dashboard
      </motion.h1>

      {/* SEARCH BAR */}
      <div className="relative mb-12">
        <Search className="absolute left-4 top-3 text-zinc-500" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search problems..."
          className="w-full bg-zinc-900 border border-red-900/40 
          rounded-xl py-3 pl-12 pr-4 text-white 
          focus:outline-none focus:border-red-500 
          transition duration-300 hover:border-red-500"
        />
      </div>

      {/* STATS SECTION (STATIC FOR NOW) */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {[
          { label: "Problems Available", value: problems.length },
          { label: "Current Streak", value: "0 Days" },
          { label: "Ranking", value: "Top 0%" },
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

      {/* TOPIC CARDS */}
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
          <Link
            key={i}
            to={`/topic/${topic.id}`}
            className="p-6 bg-zinc-900 border border-red-900/30 
            rounded-2xl cursor-pointer
            transition-all duration-300 
            hover:scale-105 hover:border-red-500"
          >
            <h3 className="font-semibold">{topic.name}</h3>
          </Link>
        ))}
      </div>

    {/* RECOMMENDED SECTION */}
    <h2 className="text-2xl font-semibold mt-16 mb-6 text-red-500">
      Recommended For You
    </h2>

    <div className="space-y-5">

      {/* EASY */}
      <div
        onClick={() => navigate(`/problem/${problem._id}`)}
        className="flex justify-between items-center p-5 
        bg-zinc-900 border border-green-900/30 
        rounded-xl cursor-pointer
        transition-all duration-500 ease-in-out
        hover:scale-105 hover:border-green-500 hover:shadow-lg"
      >
        <span className="text-lg">Find Maximum Element</span>

        <span className="bg-green-900 text-green-400 px-3 py-1 rounded-full text-sm">
          Easy
        </span>
      </div>

      {/* MEDIUM */}
      <div
        onClick={() => navigate("/practice/static2")}
        className="flex justify-between items-center p-5 
        bg-zinc-900 border border-yellow-900/30 
        rounded-xl cursor-pointer
        transition-all duration-500 ease-in-out
        hover:scale-105 hover:border-yellow-500 hover:shadow-lg"
      >
        <span className="text-lg">Reverse Linked List</span>

        <span className="bg-yellow-900 text-yellow-400 px-3 py-1 rounded-full text-sm">
          Medium
        </span>
      </div>

      {/* HARD */}
      <div
        onClick={() => navigate("/practice/static3")}
        className="flex justify-between items-center p-5 
        bg-zinc-900 border border-red-900/30 
        rounded-xl cursor-pointer
        transition-all duration-500 ease-in-out
        hover:scale-105 hover:border-red-500 hover:shadow-lg"
      >
        <span className="text-lg">Trapping Rain Water</span>

        <span className="bg-red-900 text-red-400 px-3 py-1 rounded-full text-sm">
          Hard
        </span>
      </div>

    </div>
    </div>
  );
}