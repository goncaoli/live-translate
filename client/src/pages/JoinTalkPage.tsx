import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { HubConnection } from "@microsoft/signalr";
import { SOURCE_LANGUAGE, SUPPORTED_LANGUAGES, getSelectableLanguages } from "../lib/languages";
import { connect } from "../lib/signalr";
import { joinGroup, announcePresence, announceLeave, announceLeaveBeacon, getAgenda, type Talk } from "../lib/api";
import { formatByline } from "../lib/countdown";

interface Caption {
  text: string;
  original: string;
  final: boolean;
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("404") || message.includes("negotiate")) {
    return "Não foi possível ligar à sessão. Tenta novamente.";
  }
  return "Algo correu mal. Tenta novamente.";
}

export default function JoinTalkPage() {
  const { talkId = "" } = useParams();
  const [talk, setTalk] = useState<Talk | null>(null);
  const [lang, setLang] = useState(SUPPORTED_LANGUAGES[1]?.code ?? "en");
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [connectionState, setConnectionState] = useState<"live" | "reconnecting">("live");
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const connectionRef = useRef<HubConnection | null>(null);
  const joinedRef = useRef(false);

  const selectableLanguages = talk ? getSelectableLanguages(talk.sourceLanguage ?? SOURCE_LANGUAGE) : SUPPORTED_LANGUAGES;
  // If the talk's source language turns out to exclude the currently
  // selected one (e.g. it loaded after mount and matches the default pick),
  // fall back to the first still-valid option — derived at render time
  // instead of synced via an effect.
  const effectiveLang = selectableLanguages.some((l) => l.code === lang) ? lang : (selectableLanguages[0]?.code ?? lang);

  useEffect(() => {
    getAgenda()
      .then((agenda) => setTalk(agenda.talks.find((t) => t.id === talkId) ?? null))
      .catch(() => {});
  }, [talkId]);

  useEffect(() => {
    function handlePageHide() {
      if (joinedRef.current) announceLeaveBeacon(talkId);
    }
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [talkId]);

  useEffect(() => {
    return () => {
      connectionRef.current?.stop();
      if (joinedRef.current) announceLeave(talkId).catch(() => {});
    };
  }, [talkId]);

  async function enter() {
    setError(null);
    setJoining(true);
    try {
      const connection = await connect(talkId, (connectionId) => {
        joinGroup(connectionId, talkId, effectiveLang)
          .then(() => setConnectionState("live"))
          .catch(() => {});
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

      await joinGroup(connection.connectionId ?? "", talkId, effectiveLang);
      announcePresence(talkId).catch(() => {});
      connectionRef.current = connection;
      joinedRef.current = true;
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
        <span className="eyebrow">{talk ? formatByline(talk.speaker, talk.speakerRole) : ""}</span>
        <h1>{talk?.title ?? "Escolhe o teu idioma"}</h1>
        <select className="lang-select" value={effectiveLang} onChange={(e) => setLang(e.target.value)}>
          {selectableLanguages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <button className="button" onClick={enter} disabled={joining}>
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
