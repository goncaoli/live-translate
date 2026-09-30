import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import JoinTalkPage from "./pages/JoinTalkPage";
import DisplayPage from "./pages/DisplayPage";

// Pulls in the Azure Speech SDK (~500kB) and qrcode.react — only the
// speaker needs either, so keep them out of the initial bundle everyone
// else (the vast majority, on phones) downloads just to see the agenda.
const SpeakTalkPage = lazy(() => import("./pages/SpeakTalkPage"));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/talk/:talkId/speak"
        element={
          <Suspense fallback={<div className="page empty-state">A carregar…</div>}>
            <SpeakTalkPage />
          </Suspense>
        }
      />
      <Route path="/talk/:talkId/join" element={<JoinTalkPage />} />
      <Route path="/display/:roomId" element={<DisplayPage />} />
    </Routes>
  );
}
