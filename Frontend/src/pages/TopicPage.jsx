import { useParams, useNavigate } from "react-router-dom";
import { topics } from "../data/topics";
import { getImplementedProblemId } from "../data/problems";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";

export default function TopicPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
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
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />
      <main className="px-10 py-10 max-w-6xl mx-auto">
        {/* PAGE TITLE */}
        <h1 className="text-4xl font-bold text-red-500 mb-10">
          {topic.title}
        </h1>

        {/* QUESTIONS LIST */}
        <div className="space-y-4">
          {questionList.map((problem, i) => {
            const targetId = getImplementedProblemId(problem.title);
            const isClickable = Boolean(targetId);

            return (
              <div
                key={i}
                onClick={
                  isClickable
                    ? () =>
                        requireAuth(
                          () => navigate(`/problem/${targetId}`),
                          `Please sign in with your Google account first to solve "${problem.title}".`
                        )
                    : undefined
                }
                className={`flex justify-between items-center p-6 
                bg-zinc-900 border border-red-900/30 
                rounded-2xl transition-all duration-300 
                ${
                  isClickable
                    ? "cursor-pointer hover:scale-[1.01] hover:border-red-500 shadow-lg hover:shadow-red-500/10"
                    : "cursor-default select-none"
                }`}
              >
                <span className="text-lg font-medium text-zinc-100">{problem.title?.replace(/\.+$/, '') || problem.title}</span>

                <span
                  className={`px-4 py-1 rounded-full text-sm font-semibold tracking-wide ${
                    problem.difficulty === "Easy"
                      ? "bg-green-900/80 text-green-400 border border-green-700/40"
                      : problem.difficulty === "Medium"
                      ? "bg-yellow-900/80 text-yellow-400 border border-yellow-700/40"
                      : "bg-red-900/80 text-red-400 border border-red-700/40"
                  }`}
                >
                  {problem.difficulty}
                </span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
