import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import PracticePage from "./pages/PracticePage";
import ProblemsList from "./pages/ProblemsList";
import ProblemDetails from "./pages/ProblemDetails";
import ProblemSolve from "./pages/ProblemSolve";
import Profile from "./pages/Profile";
import TopicPage from "./pages/TopicPage";
import { AuthProvider, useAuth } from "./context/AuthContext";

function RequireLogin({ children }) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  if (isAuthLoading) return <HomePage />;
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route path="/dashboard" element={<RequireLogin><Dashboard /></RequireLogin>} />
      <Route path="/practice" element={<RequireLogin><PracticePage /></RequireLogin>} />
      <Route path="/explore" element={<RequireLogin><ProblemsList /></RequireLogin>} />
      <Route path="/problems/:id" element={<RequireLogin><ProblemDetails /></RequireLogin>} />
      <Route path="/problem/:id" element={<RequireLogin><ProblemSolve /></RequireLogin>} />
      <Route path="/profile" element={<RequireLogin><Profile /></RequireLogin>} />
      <Route path="/topic/:topicId" element={<RequireLogin><TopicPage /></RequireLogin>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
