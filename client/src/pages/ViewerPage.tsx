import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { HubConnection } from "@microsoft/signalr";
import { SUPPORTED_LANGUAGES } from "../lib/languages";
import { connect } from "../lib/signalr";
import { joinGroup } from "../lib/api";

interface Caption {
  text: string;
  original: string;
}

export default function ViewerPage() {
  const { sessionId = "" } = useParams();
  const [lang, setLang] = useState(SUPPORTED_LANGUAGES[1]?.code ?? "en");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    return () => {
      connectionRef.current?.stop();
    };
  }, []);

  async function enter() {
    setError(null);
    try {
      const connection = await connect(sessionId);
      connection.on("translation", (payload: Caption) => {
        setCaptions((prev) => [payload, ...prev].slice(0, 30));
      });
      await joinGroup(connection.connectionId ?? "", sessionId, lang);
      connectionRef.current = connection;
      setJoined(true);
    } catch (err) {
      setError(String(err));
    }
  }

  if (!joined) {
    return (
      <div className="page">
        <h1>Escolhe o teu idioma</h1>
        <p>Sessão: {sessionId}</p>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <button className="button" onClick={enter}>
          Entrar
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Legendas</h1>
      <ul className="captions">
        {captions.map((c, i) => (
          <li key={i} className={i === 0 ? "caption-latest" : ""}>
            {c.text}
          </li>
        ))}
      </ul>
      {captions.length === 0 && <p>À espera do orador…</p>}
    </div>
  );
}
