import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { HubConnection } from "@microsoft/signalr";
import type { TranslationRecognizer } from "microsoft-cognitiveservices-speech-sdk";
import { createSessionId, joinUrl } from "../lib/session";
import { PRESENCE_LANG, SOURCE_LANGUAGE, SUPPORTED_LANGUAGES } from "../lib/languages";
import { getSpeechToken, broadcast, joinGroup } from "../lib/api";
import { connect } from "../lib/signalr";
import { startTranslation, stopTranslation } from "../lib/speech";

const TARGET_LANGUAGES = SUPPORTED_LANGUAGES.filter((l) => l.code !== "pt").map((l) => l.code);

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("Permission") || message.includes("NotAllowed")) {
    return "Sem acesso ao microfone — autoriza nas definições do browser.";
  }
  return "Algo correu mal. Tenta novamente.";
}

export default function SpeakerPage() {
  const [sessionId] = useState(createSessionId);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [participants, setParticipants] = useState(0);
  const [copied, setCopied] = useState(false);
  const recognizerRef = useRef<TranslationRecognizer | null>(null);
  const presenceConnectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function trackPresence() {
      try {
        const connection = await connect(sessionId, (connectionId) => {
          joinGroup(connectionId, sessionId, PRESENCE_LANG).catch(() => {});
        });
        if (cancelled) {
          connection.stop();
          return;
        }
        connection.on("participantJoined", () => setParticipants((n) => n + 1));
        await joinGroup(connection.connectionId ?? "", sessionId, PRESENCE_LANG);
        presenceConnectionRef.current = connection;
      } catch {
        // Presence is a nice-to-have; a failure here shouldn't block the session.
      }
    }

    trackPresence();

    return () => {
      cancelled = true;
      presenceConnectionRef.current?.stop();
      if (recognizerRef.current) stopTranslation(recognizerRef.current).catch(() => {});
    };
  }, [sessionId]);

  async function start() {
    setError(null);
    setStarting(true);
    try {
      const { token, region } = await getSpeechToken();
      const recognizer = await startTranslation(token, region, SOURCE_LANGUAGE, TARGET_LANGUAGES, {
        onFinal: (original, translations) => {
          setTranscript((prev) => [original, ...prev].slice(0, 20));
          broadcast(sessionId, original, translations).catch((err) => setError(friendlyError(err)));
        },
        onError: (details) => setError(friendlyError(new Error(details))),
      });
      recognizerRef.current = recognizer;
      setListening(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setStarting(false);
    }
  }

  async function stop() {
    if (recognizerRef.current) {
      await stopTranslation(recognizerRef.current);
      recognizerRef.current = null;
    }
    setListening(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl(sessionId));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="page">
      <span className="eyebrow">Sessão ativa</span>
      <h1>{sessionId}</h1>

      <div className={`status-badge ${listening ? "is-live" : ""}`}>
        <span className="status-dot" />
        {listening ? "A ouvir" : "Parado"}
      </div>

      <div className="card">
        <div className="qr-frame">
          <QRCodeSVG value={joinUrl(sessionId)} size={200} />
        </div>
        <div className="session-code">
          {sessionId}
          <button className="copy-button" onClick={copyLink}>
            {copied ? "Copiado" : "Copiar link"}
          </button>
        </div>
        <p className="subtitle">
          {participants > 0 ? `${participants} pessoa${participants === 1 ? "" : "s"} ligada${participants === 1 ? "" : "s"}` : "À espera de participantes"}
        </p>
      </div>

      {!listening ? (
        <button className="button" onClick={start} disabled={starting}>
          {starting ? "A ligar…" : "Começar a falar →"}
        </button>
      ) : (
        <button className="button button-stop" onClick={stop}>
          Parar
        </button>
      )}

      {error && <p className="error">{error}</p>}

      {transcript.length > 0 && (
        <ul className="transcript">
          {transcript.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
