import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

function Problems() {
  const [problems, setProblems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/problems")
      .then(res => res.json())
      .then(data => setProblems(data));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />
      <main className="p-8">
      <h2 className="text-3xl font-bold text-red-500">All Problems</h2>
      {problems.map(problem => (
        <div
          key={problem._id}
          onClick={() => navigate(`/practice/${problem._id}`)}
          style={{ cursor: "pointer", margin: "10px 0" }}
        >
          <h3>{problem.title}</h3>
          <p>{problem.difficulty}</p>
        </div>
      ))}
      </main>
    </div>
  );
}

export default Problems;
