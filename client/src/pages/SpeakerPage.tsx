import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { TranslationRecognizer } from "microsoft-cognitiveservices-speech-sdk";
import { createSessionId, joinUrl } from "../lib/session";
import { SOURCE_LANGUAGE, SUPPORTED_LANGUAGES } from "../lib/languages";
import { getSpeechToken, broadcast } from "../lib/api";
import { startTranslation, stopTranslation } from "../lib/speech";

const TARGET_LANGUAGES = SUPPORTED_LANGUAGES.filter((l) => l.code !== "pt").map((l) => l.code);

export default function SpeakerPage() {
  const [sessionId] = useState(createSessionId);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const recognizerRef = useRef<TranslationRecognizer | null>(null);

  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        stopTranslation(recognizerRef.current).catch(() => {});
      }
    };
  }, []);

  async function start() {
    setError(null);
    try {
      const { token, region } = await getSpeechToken();
      const recognizer = await startTranslation(token, region, SOURCE_LANGUAGE, TARGET_LANGUAGES, {
        onFinal: (original, translations) => {
          setTranscript((prev) => [original, ...prev].slice(0, 20));
          broadcast(sessionId, original, translations).catch((err) => setError(String(err)));
        },
        onError: (details) => setError(details),
      });
      recognizerRef.current = recognizer;
      setListening(true);
    } catch (err) {
      setError(String(err));
    }
  }

  async function stop() {
    if (recognizerRef.current) {
      await stopTranslation(recognizerRef.current);
      recognizerRef.current = null;
    }
    setListening(false);
  }

  return (
    <div className="page">
      <h1>Sessão {sessionId}</h1>
      <p>Os participantes fazem scan do QR Code para escolher o idioma e ler a tradução.</p>

      <div className="qr-box">
        <QRCodeSVG value={joinUrl(sessionId)} size={220} />
        <code>{joinUrl(sessionId)}</code>
      </div>

      {!listening ? (
        <button className="button" onClick={start}>
          Começar a falar
        </button>
      ) : (
        <button className="button button-stop" onClick={stop}>
          Parar
        </button>
      )}

      {error && <p className="error">{error}</p>}

      <ul className="transcript">
        {transcript.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
