import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { HubConnection } from "@microsoft/signalr";
import { SUPPORTED_LANGUAGES, getSelectableLanguages } from "../lib/languages";
import { connect } from "../lib/signalr";
import {
  joinGroup,
  announcePresence,
  announceLeave,
  announceLeaveBeacon,
  getAgenda,
  type AgendaResponse,
} from "../lib/api";
import { findCurrentTalk } from "../lib/countdown";

interface Caption {
  text: string;
  original: string;
  final: boolean;
}

interface RoomStatusPayload {
  roomId: string;
  live: boolean;
  sourceLanguage?: string;
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("404") || message.includes("negotiate")) {
    return "Não foi possível ligar à sessão. Tenta novamente.";
  }
  return "Algo correu mal. Tenta novamente.";
}

export default function JoinRoomPage() {
  const { roomId = "" } = useParams();
  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [knownSourceLanguage, setKnownSourceLanguage] = useState<string | null>(null);
  const [roomLive, setRoomLive] = useState(false);
  const [lang, setLang] = useState(SUPPORTED_LANGUAGES[1]?.code ?? "en");
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [connectionReady, setConnectionReady] = useState(false);
  const [connectionState, setConnectionState] = useState<"live" | "reconnecting">("live");
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const connectionRef = useRef<HubConnection | null>(null);
  const joinedLangRef = useRef<string | null>(null);

  const room = agenda?.rooms.find((r) => r.id === roomId);
  const currentTalk = agenda ? findCurrentTalk(agenda.talks, roomId, now) : undefined;
  const selectableLanguages = knownSourceLanguage ? getSelectableLanguages(knownSourceLanguage) : SUPPORTED_LANGUAGES;
  const effectiveLang = selectableLanguages.some((l) => l.code === lang) ? lang : (selectableLanguages[0]?.code ?? lang);

  useEffect(() => {
    getAgenda()
      .then(setAgenda)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const connection = await connect(roomId, (connectionId) => {
          joinGroup(connectionId, "agenda", "live").catch(() => {});
          if (joinedLangRef.current) {
            joinGroup(connectionId, roomId, joinedLangRef.current).catch(() => {});
          }
        });
        if (cancelled) {
          connection.stop();
          return;
        }
        connection.on("roomStatusChanged", (payload: RoomStatusPayload) => {
          if (payload.roomId !== roomId) return;
          setRoomLive(payload.live);
          if (payload.live && payload.sourceLanguage) setKnownSourceLanguage(payload.sourceLanguage);
        });
        connection.on("translation", (payload: Caption) => {
          setCaptions((prev) => {
            // While the top caption is still in progress, keep updating it in
            // place instead of stacking a new entry per partial result — a
            // new entry only starts once the previous one has settled.
            const stillInProgress = prev.length > 0 && !prev[0].final;
            const rest = stillInProgress ? prev.slice(1) : prev;
            return [payload, ...rest].slice(0, 30);
          });
        });
        connection.onreconnecting(() => setConnectionState("reconnecting"));
        connection.onreconnected(() => setConnectionState("live"));

        await joinGroup(connection.connectionId ?? "", "agenda", "live");
        connectionRef.current = connection;
        setConnectionReady(true);
      } catch {
        // Best-effort — the join button stays disabled and the user can retry.
      }
    }

    run();

    return () => {
      cancelled = true;
      connectionRef.current?.stop();
      if (joinedLangRef.current) announceLeave(roomId).catch(() => {});
    };
  }, [roomId]);

  useEffect(() => {
    function handlePageHide() {
      if (joinedLangRef.current) announceLeaveBeacon(roomId);
    }
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [roomId]);

  async function enter() {
    const connectionId = connectionRef.current?.connectionId;
    if (!connectionId) return;
    setError(null);
    setJoining(true);
    try {
      await joinGroup(connectionId, roomId, effectiveLang);
      announcePresence(roomId).catch(() => {});
      joinedLangRef.current = effectiveLang;
      setJoined(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setJoining(false);
    }
  }

  if (!joined) {
    return (
      <div className="page">
        <span className="eyebrow">{currentTalk ? `Agora: ${currentTalk.title}` : ""}</span>
        <h1>{room?.name ?? "Escolhe o teu idioma"}</h1>
        <div className={`status-badge ${roomLive ? "is-live" : ""}`}>
          <span className="status-dot" />
          {roomLive ? "Ao vivo" : "Ainda não começou"}
        </div>
        <select className="lang-select" value={effectiveLang} onChange={(e) => setLang(e.target.value)}>
          {selectableLanguages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <button className="button" onClick={enter} disabled={joining || !connectionReady}>
          {joining ? "A entrar…" : "Entrar →"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="page">
      <div className={`status-badge ${connectionState === "live" ? "is-live" : "is-error"}`}>
        <span className="status-dot" />
        {connectionState === "live" ? "Ligado" : "A reconectar…"}
      </div>

      {captions.length === 0 ? (
        <p className="empty-state">À espera do orador…</p>
      ) : (
        <ul className="captions">
          {captions.map((c, i) => (
            <li key={i} className={i === 0 ? `caption-latest ${c.final ? "" : "caption-interim"}` : ""}>
              {c.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
