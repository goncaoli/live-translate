import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import type { HubConnection } from "@microsoft/signalr";
import type { TranslationRecognizer } from "microsoft-cognitiveservices-speech-sdk";
import { joinUrl } from "../lib/session";
import { PRESENCE_LANG, SOURCE_LANGUAGE, SUPPORTED_LANGUAGES } from "../lib/languages";
import {
  getAgenda,
  getSpeechToken,
  broadcast,
  joinGroup,
  verifyPin,
  talkStarted,
  talkEnded,
  talkEndedBeacon,
  type Talk,
} from "../lib/api";
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

export default function SpeakTalkPage() {
  const { talkId = "" } = useParams();
  const [talk, setTalk] = useState<Talk | null>(null);
  const [pin, setPin] = useState("");
  const [speakerToken, setSpeakerToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [participants, setParticipants] = useState(0);
  const [copied, setCopied] = useState(false);
  const recognizerRef = useRef<TranslationRecognizer | null>(null);
  const presenceConnectionRef = useRef<HubConnection | null>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    getAgenda()
      .then((agenda) => setTalk(agenda.talks.find((t) => t.id === talkId) ?? null))
      .catch(() => {});
  }, [talkId]);

  useEffect(() => {
    function handlePageHide() {
      if (listeningRef.current && speakerToken) {
        talkEndedBeacon(talkId, speakerToken);
      }
    }
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [talkId, speakerToken]);

  useEffect(() => {
    if (!speakerToken) return;
    let cancelled = false;

    async function trackPresence() {
      try {
        const connection = await connect(talkId, (connectionId) => {
          joinGroup(connectionId, talkId, PRESENCE_LANG).catch(() => {});
        });
        if (cancelled) {
          connection.stop();
          return;
        }
        connection.on("participantJoined", () => setParticipants((n) => n + 1));
        connection.on("participantLeft", () => setParticipants((n) => Math.max(0, n - 1)));
        await joinGroup(connection.connectionId ?? "", talkId, PRESENCE_LANG);
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
  }, [talkId, speakerToken]);

  useEffect(() => {
    return () => {
      if (recognizerRef.current) stopTranslation(recognizerRef.current).catch(() => {});
    };
  }, []);

  async function submitPin() {
    setPinError(null);
    setVerifying(true);
    try {
      const { token } = await verifyPin(talkId, pin);
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
      const { token, region } = await getSpeechToken(talkId, speakerToken);
      const recognizer = await startTranslation(token, region, SOURCE_LANGUAGE, TARGET_LANGUAGES, {
        onFinal: (original, translations) => {
          setTranscript((prev) => [original, ...prev].slice(0, 20));
          broadcast(talkId, original, translations, speakerToken).catch((err) => setError(friendlyError(err)));
        },
        onError: (details) => setError(friendlyError(new Error(details))),
      });
      recognizerRef.current = recognizer;
      setListening(true);
      listeningRef.current = true;
      talkStarted(talkId, speakerToken).catch(() => {});
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
    if (speakerToken) talkEnded(talkId, speakerToken).catch(() => {});
  }

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl(talkId));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!speakerToken) {
    return (
      <div className="page">
        <span className="eyebrow">Acesso de orador</span>
        <h1>{talk?.title ?? talkId}</h1>
        {talk && <p className="subtitle">{talk.speaker}</p>}
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
      <span className="eyebrow">{talk?.speaker}</span>
      <h1>{talk?.title ?? talkId}</h1>

      <div className={`status-badge ${listening ? "is-live" : ""}`}>
        <span className="status-dot" />
        {listening ? "A ouvir" : "Parado"}
      </div>

      <div className="card">
        <div className="qr-frame">
          <QRCodeSVG value={joinUrl(talkId)} size={200} />
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
