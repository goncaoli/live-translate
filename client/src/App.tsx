import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import JoinRoomPage from "./pages/JoinRoomPage";
import DisplayPage from "./pages/DisplayPage";

// Pulls in the Azure Speech SDK (~500kB) and qrcode.react — only the
// speaker needs either, so keep them out of the initial bundle everyone
// else (the vast majority, on phones) downloads just to see the agenda.
const SpeakRoomPage = lazy(() => import("./pages/SpeakRoomPage"));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/room/:roomId/speak"
        element={
          <Suspense fallback={<div className="page empty-state">A carregar…</div>}>
            <SpeakRoomPage />
          </Suspense>
        }
      />
      <Route path="/room/:roomId/join" element={<JoinRoomPage />} />
      <Route path="/display/:roomId" element={<DisplayPage />} />
    </Routes>
  );
}
