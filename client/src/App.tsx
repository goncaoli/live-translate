import { Route, Routes } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import SpeakerPage from "./pages/SpeakerPage";
import ViewerPage from "./pages/ViewerPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/speak" element={<SpeakerPage />} />
      <Route path="/join/:sessionId" element={<ViewerPage />} />
    </Routes>
  );
}
