import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import type { HubConnection } from "@microsoft/signalr";
import type { TranslationRecognizer } from "microsoft-cognitiveservices-speech-sdk";
import { joinUrl } from "../lib/session";
import { PRESENCE_LANG, SOURCE_LANGUAGE, SOURCE_LANGUAGE_OPTIONS, getSelectableLanguages } from "../lib/languages";
import {
  getAgenda,
  getSpeechToken,
  broadcast,
  joinGroup,
  verifyPin,
  roomStarted,
  roomEnded,
  roomEndedBeacon,
  type AgendaResponse,
} from "../lib/api";
import { connect } from "../lib/signalr";
import { startTranslation, stopTranslation } from "../lib/speech";
import { findCurrentTalk } from "../lib/countdown";

// Caps how often partial (not-yet-final) translations go out while the
// speaker is mid-sentence — keeps captions feeling live without flooding
// SignalR with a message on every recognizer tick.
const INTERIM_BROADCAST_INTERVAL_MS = 250;

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("Permission") || message.includes("NotAllowed")) {
    return "Sem acesso ao microfone — autoriza nas definições do browser.";
  }
  return "Algo correu mal. Tenta novamente.";
}

export default function SpeakRoomPage() {
  const { roomId = "" } = useParams();
  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [pin, setPin] = useState("");
  const [speakerToken, setSpeakerToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const [sourceLanguage, setSourceLanguage] = useState(SOURCE_LANGUAGE);
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [participants, setParticipants] = useState(0);
  const [copied, setCopied] = useState(false);
  const recognizerRef = useRef<TranslationRecognizer | null>(null);
  const presenceConnectionRef = useRef<HubConnection | null>(null);
  const listeningRef = useRef(false);
  const lastInterimSentRef = useRef(0);

  const room = agenda?.rooms.find((r) => r.id === roomId);
  const currentTalk = agenda ? findCurrentTalk(agenda.talks, roomId, now) : undefined;

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
    function handlePageHide() {
      if (listeningRef.current && speakerToken) {
        roomEndedBeacon(roomId, speakerToken);
      }
    }
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [roomId, speakerToken]);

  useEffect(() => {
    if (!speakerToken) return;
    let cancelled = false;

    async function trackPresence() {
      try {
        const connection = await connect(roomId, (connectionId) => {
          joinGroup(connectionId, roomId, PRESENCE_LANG).catch(() => {});
        });
        if (cancelled) {
          connection.stop();
          return;
        }
        connection.on("participantJoined", () => setParticipants((n) => n + 1));
        connection.on("participantLeft", () => setParticipants((n) => Math.max(0, n - 1)));
        await joinGroup(connection.connectionId ?? "", roomId, PRESENCE_LANG);
        presenceConnectionRef.current = connection;
      } catch {
        // Presence is a nice-to-have; a failure here shouldn't block the session.
      }
    }

    trackPresence();

    return () => {
      cancelled = true;
      presenceConnectionRef.current?.stop();
    };
  }, [roomId, speakerToken]);

  useEffect(() => {
    return () => {
      if (recognizerRef.current) stopTranslation(recognizerRef.current).catch(() => {});
    };
  }, []);

  async function submitPin() {
    setPinError(null);
    setVerifying(true);
    try {
      const { token } = await verifyPin(roomId, pin);
      setSpeakerToken(token);
    } catch {
      setPinError("PIN inválido.");
    } finally {
      setVerifying(false);
    }
  }

  async function start() {
    if (!speakerToken) return;
    setError(null);
    setStarting(true);
    try {
      const { token, region } = await getSpeechToken(roomId, speakerToken);
      const targetLanguages = getSelectableLanguages(sourceLanguage).map((l) => l.code);
      const recognizer = await startTranslation(token, region, sourceLanguage, targetLanguages, {
        onInterim: (original, translations) => {
          const now = Date.now();
          if (now - lastInterimSentRef.current < INTERIM_BROADCAST_INTERVAL_MS) return;
          lastInterimSentRef.current = now;
          broadcast(roomId, original, translations, speakerToken, false).catch(() => {});
        },
        onFinal: (original, translations) => {
          lastInterimSentRef.current = Date.now();
          setTranscript((prev) => [original, ...prev].slice(0, 20));
          broadcast(roomId, original, translations, speakerToken, true).catch((err) => setError(friendlyError(err)));
        },
        onError: (details) => setError(friendlyError(new Error(details))),
      });
      recognizerRef.current = recognizer;
      setListening(true);
      listeningRef.current = true;
      roomStarted(roomId, speakerToken, sourceLanguage).catch(() => {});
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
    listeningRef.current = false;
    if (speakerToken) roomEnded(roomId, speakerToken).catch(() => {});
  }

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl(roomId));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!speakerToken) {
    return (
      <div className="page">
        <span className="eyebrow">Acesso de orador</span>
        <h1>{room?.name ?? roomId}</h1>
        {currentTalk && <p className="subtitle">Agora: {currentTalk.title}</p>}
        <input
          className="pin-input"
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitPin()}
        />
        <button className="button" onClick={submitPin} disabled={verifying || pin.length === 0}>
          {verifying ? "A verificar…" : "Entrar como orador →"}
        </button>
        {pinError && <p className="error">{pinError}</p>}
      </div>
    );
  }

  return (
    <div className="page">
      <span className="eyebrow">{currentTalk ? `Agora: ${currentTalk.title}` : ""}</span>
      <h1>{room?.name ?? roomId}</h1>

      <div className={`status-badge ${listening ? "is-live" : ""}`}>
        <span className="status-dot" />
        {listening ? "A ouvir" : "Parado"}
      </div>

      <select
        className="lang-select"
        value={sourceLanguage}
        onChange={(e) => setSourceLanguage(e.target.value)}
        disabled={listening}
      >
        {SOURCE_LANGUAGE_OPTIONS.map((l) => (
          <option key={l.code} value={l.code}>
            A falar em {l.label}
          </option>
        ))}
      </select>

      <div className="card">
        <div className="qr-frame">
          <QRCodeSVG value={joinUrl(roomId)} size={200} />
        </div>
        <div className="session-code">
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
