import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import PracticePage from "./pages/PracticePage";
import ProblemsList from "./pages/ProblemsList";
import ProblemDetails from "./pages/ProblemDetails";
import ProblemSolve from "./pages/ProblemSolve";
import Profile from "./pages/Profile";
import TopicPage from "./pages/TopicPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/explore" element={<ProblemsList />} />
        <Route path="/problems/:id" element={<ProblemDetails />} />
        <Route path="/problem/:id" element={<ProblemSolve />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/topic/:topicId" element={<TopicPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;