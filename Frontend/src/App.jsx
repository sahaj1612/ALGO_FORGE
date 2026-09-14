import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import PracticePage from "./pages/PracticePage";
import ProblemsList from "./pages/ProblemsList";
import ProblemDetails from "./pages/ProblemDetails";
import ProblemSolve from "./pages/ProblemSolve";
import Profile from "./pages/Profile";
import TopicPage from "./pages/TopicPage";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/explore" element={<ProblemsList />} />
          <Route path="/problems/:id" element={<ProblemDetails />} />
          <Route path="/problem/:id" element={<ProblemSolve />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/topic/:topicId" element={<TopicPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
