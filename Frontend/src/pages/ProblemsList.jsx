import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ExploreProblems() {
  const [problems, setProblems] = useState([]);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [user, setUser] = useState(null); // user state for profile

  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/problems")
      .then(res => res.json())
      .then(data => setProblems(data))
      .catch(err => console.error(err));
  }, []);

    /// profile

    useEffect(() => {
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
    } else {
      navigate("/");   // if not logged in
    }
  }, []);

  const filtered = problems.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) &&
    (difficulty === "All" || p.difficulty === difficulty)
  );

  return (

    

    <div className="min-h-screen bg-black text-white px-10 py-10">

       {/* ✅ HEADER */}
    <div className="flex justify-between items-center mb-8">

      {/* BACK BUTTON */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 
        bg-zinc-900 border border-red-900/40
        px-4 py-2 rounded-xl
        hover:border-red-500 transition"
      >
        ← Back
      </button>

      {/* PROFILE */}
        {user && (
          <div className="flex items-center gap-3">
            <img
              src={user.picture}
              alt="profile"
              onClick={() => navigate("/profile")}
              className="w-11 h-11 rounded-full border-2 border-red-500 
              hover:scale-110 transition duration-300 cursor-pointer"
            />

            <div className="hidden md:block">
              <p className="font-semibold">{user.name}</p>
              <p className="text-xs text-zinc-400">{user.email}</p>
            </div>
          </div>
        )}
        
      </div>

      <h1 className="text-4xl font-bold text-red-500 mb-10">
        Explore Problems
      </h1>

      {/* SEARCH + FILTER */}
      <div className="flex gap-6 mb-10">

        <div className="relative w-full">
          <Search className="absolute left-4 top-3 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-red-900/40 
            rounded-xl py-3 pl-12 pr-4 text-white 
            focus:outline-none focus:border-red-500"
          />
        </div>

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="bg-zinc-900 border border-red-900/40 
          rounded-xl px-4 text-white"
        >
          <option>All</option>
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>

      </div>

      {/* PROBLEM TABLE */}
      <div className="bg-zinc-900 border border-red-900/30 rounded-2xl overflow-hidden">

        <div className="grid grid-cols-3 p-4 border-b border-red-900/30 text-zinc-400">
          <span>Title</span>
          <span>Difficulty</span>
          <span>Action</span>
        </div>

        {filtered.map(problem => (
          <div
            key={problem._id}
            className="grid grid-cols-3 p-4 border-b border-zinc-800 
            hover:bg-zinc-800 transition"
          >
            <span>{problem.title}</span>

            <span
              className={`font-semibold ${
                problem.difficulty === "Easy"
                  ? "text-green-400"
                  : problem.difficulty === "Medium"
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {problem.difficulty}
            </span>

            <button
              onClick={() => navigate(`/problem/${problem._id}`)}
              className="bg-red-600 px-4 py-1 rounded-lg hover:bg-red-700"
            >
              Solve
            </button>
          </div>
        ))}

      </div>

    </div>
  );
}