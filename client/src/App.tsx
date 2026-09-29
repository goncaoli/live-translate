import { Route, Routes } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import SpeakTalkPage from "./pages/SpeakTalkPage";
import JoinTalkPage from "./pages/JoinTalkPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/talk/:talkId/speak" element={<SpeakTalkPage />} />
      <Route path="/talk/:talkId/join" element={<JoinTalkPage />} />
    </Routes>
  );
}
