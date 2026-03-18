import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import Practice from "./Practice";
import Problems from "./pages/Problems";
import Dashboard from "./Dashboard";
import TopicPage from "./pages/TopicPage";
import ExploreProblems from "./pages/ExploreProblems";
import ProblemSolve from "./pages/ProblemSolve";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/explore" element={<ExploreProblems />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/topic/:topicId" element={<TopicPage />} />
        <Route path="/practice/:id" element={<Practice />} />
        <Route path="/practice/static1" element={<ProblemSolve />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;