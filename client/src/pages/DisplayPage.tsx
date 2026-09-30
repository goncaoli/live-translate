import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { HubConnection } from "@microsoft/signalr";
import { getAgenda, joinGroup, type AgendaResponse } from "../lib/api";
import { connect } from "../lib/signalr";

interface TalkStatusPayload {
  talkId: string;
  live: boolean;
}

interface Caption {
  text: string;
  original: string;
  final: boolean;
}

const DEFAULT_ROOM = "tribuna-presidencial";

// Unattended TV/monitor view: no picker, no buttons — it auto-follows
// whichever talk is currently live in the given room and shows a big
// lower-third caption in the requested language (defaults to English).
// Meant to stay open in a browser for the whole event; see README for the
// one caveat (a mid-event refresh can miss the "already live" state).
export default function DisplayPage() {
  const { roomId = DEFAULT_ROOM } = useParams();
  const [searchParams] = useSearchParams();
  const lang = searchParams.get("lang") ?? "en";
  // ?embed=1 — for <iframe>-ing this into another site (e.g. the event's own
  // page): fills its container instead of taking over the viewport, and
  // drops the speaker-name overlay to keep it a plain caption strip.
  const isEmbed = searchParams.get("embed") === "1";

  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [liveTalks, setLiveTalks] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState<Caption | null>(null);
  const [connectionReady, setConnectionReady] = useState(false);
  const connectionRef = useRef<HubConnection | null>(null);
  const joinedTalkRef = useRef<string | null>(null);

  useEffect(() => {
    getAgenda()
      .then(setAgenda)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const connection = await connect("display", (connectionId) => {
          joinGroup(connectionId, "agenda", "live").catch(() => {});
          if (joinedTalkRef.current) {
            joinGroup(connectionId, joinedTalkRef.current, lang).catch(() => {});
          }
        });
        if (cancelled) {
          connection.stop();
          return;
        }
        connection.on("talkStatusChanged", ({ talkId, live }: TalkStatusPayload) => {
          setLiveTalks((prev) => {
            const next = new Set(prev);
            if (live) next.add(talkId);
            else next.delete(talkId);
            return next;
          });
        });
        connection.on("translation", (payload: Caption) => setCaption(payload));
        await joinGroup(connection.connectionId ?? "", "agenda", "live");
        connectionRef.current = connection;
        setConnectionReady(true);
      } catch {
        // Best-effort — the screen just stays blank if it can't connect.
      }
    }

    run();

    return () => {
      cancelled = true;
      connectionRef.current?.stop();
    };
  }, [lang]);

  useEffect(() => {
    const connectionId = connectionRef.current?.connectionId;
    if (!agenda || !connectionId) return;

    const current = agenda.talks.find((t) => t.roomId === roomId && liveTalks.has(t.id));
    const talkId = current?.id ?? null;
    if (talkId === joinedTalkRef.current) return;

    joinedTalkRef.current = talkId;
    setCaption(null);
    if (talkId) {
      joinGroup(connectionId, talkId, lang).catch(() => {});
    }
  }, [agenda, liveTalks, roomId, lang, connectionReady]);

  const currentTalk = agenda?.talks.find((t) => t.roomId === roomId && liveTalks.has(t.id));

  return (
    <div className={`display-page ${isEmbed ? "display-embed" : ""}`}>
      {!isEmbed && currentTalk && <div className="display-speaker">{currentTalk.speaker || currentTalk.title}</div>}
      <div className="display-caption-bar">{caption?.text}</div>
    </div>
  );
}
