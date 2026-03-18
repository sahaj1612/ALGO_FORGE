import { useParams, useNavigate } from "react-router-dom";
import { topics } from "../data/topics";

export default function TopicPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const topic = topics[topicId];

  if (!topic) {
    return <div className="text-white p-10">Topic not found</div>;
  }

  const questionList = [
    { title: topic.questions.easy, difficulty: "Easy" },
    { title: topic.questions.medium, difficulty: "Medium" },
    { title: topic.questions.hard, difficulty: "Hard" },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-10 py-10">

      {/* BACK BUTTON */}
      <button
        onClick={() => navigate("/practice")}
        className="mb-6 px-4 py-2 rounded-xl border border-red-500 text-red-500
        transition-all duration-300 hover:bg-red-600 hover:text-white hover:scale-105"
      >
        ← Back to Practice
      </button>

      {/* PAGE TITLE */}
      <h1 className="text-4xl font-bold text-red-500 mb-10">
        {topic.title}
      </h1>

      {/* QUESTIONS LIST */}
      <div className="space-y-6">
        {questionList.map((problem, i) => (
          <div
            key={i}
            className="flex justify-between items-center p-6 
            bg-zinc-900 border border-red-900/30 
            rounded-2xl transition-all duration-300 
            hover:scale-105 hover:border-red-500"
          >
            <span className="text-lg">{problem.title}</span>

            <span
              className={`px-4 py-1 rounded-full text-sm font-medium ${
                problem.difficulty === "Easy"
                  ? "bg-green-900 text-green-400"
                  : problem.difficulty === "Medium"
                  ? "bg-yellow-900 text-yellow-400"
                  : "bg-red-900 text-red-400"
              }`}
            >
              {problem.difficulty}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}