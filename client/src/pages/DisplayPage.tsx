import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { HubConnection } from "@microsoft/signalr";
import { getAgenda, joinGroup, type AgendaResponse } from "../lib/api";
import { connect } from "../lib/signalr";
import { findCurrentTalk } from "../lib/countdown";

interface Caption {
  text: string;
  original: string;
  final: boolean;
}

const DEFAULT_ROOM = "tribuna-presidencial";

// Unattended TV/monitor view: no picker, no buttons. The translation session
// is per-room, so this just joins that room's caption feed directly — no
// need to guess which talk happens to be live. Meant to stay open in a
// browser for the whole event.
export default function DisplayPage() {
  const { roomId = DEFAULT_ROOM } = useParams();
  const [searchParams] = useSearchParams();
  const lang = searchParams.get("lang") ?? "en";
  // ?embed=1 — for <iframe>-ing this into another site (e.g. the event's own
  // page): fills its container instead of taking over the viewport, and
  // drops the speaker-name overlay to keep it a plain caption strip.
  const isEmbed = searchParams.get("embed") === "1";

  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [caption, setCaption] = useState<Caption | null>(null);

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
    const connectionRef = { current: null as HubConnection | null };

    async function run() {
      try {
        const connection = await connect(roomId, (connectionId) => {
          joinGroup(connectionId, roomId, lang).catch(() => {});
        });
        if (cancelled) {
          connection.stop();
          return;
        }
        connection.on("translation", (payload: Caption) => setCaption(payload));
        await joinGroup(connection.connectionId ?? "", roomId, lang);
        connectionRef.current = connection;
      } catch {
        // Best-effort — the screen just stays blank if it can't connect.
      }
    }

    run();

    return () => {
      cancelled = true;
      connectionRef.current?.stop();
    };
  }, [roomId, lang]);

  const currentTalk = agenda ? findCurrentTalk(agenda.talks, roomId, now) : undefined;

  return (
    <div className={`display-page ${isEmbed ? "display-embed" : ""}`}>
      {!isEmbed && currentTalk && <div className="display-speaker">{currentTalk.title}</div>}
      <div className="display-caption-bar">{caption?.text}</div>
    </div>
  );
}
