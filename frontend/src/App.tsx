import { Navigate, Route, Routes } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import MeetingPage from "./pages/MeetingPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/meeting/:roomId" element={<MeetingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
