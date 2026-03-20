import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Problems() {
  const [problems, setProblems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/problems")
      .then(res => res.json())
      .then(data => setProblems(data));
  }, []);

  return (
    <div>
      <h2>All Problems</h2>
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
    </div>
  );
}

export default Problems;