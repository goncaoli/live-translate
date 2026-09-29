import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { HubConnection } from "@microsoft/signalr";
import { getAgenda, joinGroup, type AgendaResponse } from "../lib/api";
import { connect } from "../lib/signalr";
import { formatCountdown, formatTimeRange, getPhase } from "../lib/countdown";

interface TalkStatusPayload {
  talkId: string;
  live: boolean;
}

interface ParticipantPayload {
  talkId: string;
}

export default function HomePage() {
  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveTalks, setLiveTalks] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => new Date());
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    getAgenda()
      .then(setAgenda)
      .catch(() => setError("Não foi possível carregar a agenda."));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function subscribeToAgendaUpdates() {
      try {
        const connection = await connect("agenda", (connectionId) => {
          joinGroup(connectionId, "agenda", "live").catch(() => {});
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
        connection.on("participantJoined", ({ talkId }: ParticipantPayload) => {
          setParticipants((prev) => ({ ...prev, [talkId]: (prev[talkId] ?? 0) + 1 }));
        });
        connection.on("participantLeft", ({ talkId }: ParticipantPayload) => {
          setParticipants((prev) => ({ ...prev, [talkId]: Math.max(0, (prev[talkId] ?? 0) - 1) }));
        });
        await joinGroup(connection.connectionId ?? "", "agenda", "live");
        connectionRef.current = connection;
      } catch {
        // Live badges are a nice-to-have; the agenda still works without them.
      }
    }

    subscribeToAgendaUpdates();

    return () => {
      cancelled = true;
      connectionRef.current?.stop();
    };
  }, []);

  return (
    <div className="page page-wide">
      <span className="eyebrow">Agenda</span>
      <h1>Live Translate</h1>
      <p className="subtitle">Escolhe uma palestra para ouvir a tradução em tempo real no teu telemóvel.</p>

      {error && <p className="error">{error}</p>}
      {!agenda && !error && <p className="empty-state">A carregar agenda…</p>}

      {agenda?.rooms.map((room) => {
        const talks = agenda.talks.filter((t) => t.roomId === room.id);
        if (talks.length === 0) return null;

        return (
          <section key={room.id} className="room-section">
            <h2>{room.name}</h2>
            <ul className="talk-list">
              {talks.map((talk) => {
                const live = liveTalks.has(talk.id);
                const count = participants[talk.id] ?? 0;
                const phase = getPhase(talk.startsAt, talk.endsAt, now);

                return (
                  <li key={talk.id} className="talk-card">
                    <div className="talk-card-header">
                      <span className="talk-time">{formatTimeRange(talk.startsAt, talk.endsAt)}</span>
                      {live ? (
                        <span className="status-badge is-live">
                          <span className="status-dot" />
                          Ao vivo
                        </span>
                      ) : phase === "upcoming" ? (
                        <span className="status-badge">{formatCountdown(talk.startsAt, now)}</span>
                      ) : phase === "ongoing" ? (
                        <span className="status-badge">A decorrer</span>
                      ) : (
                        <span className="status-badge">Terminada</span>
                      )}
                    </div>
                    <h3 className="talk-title">{talk.title}</h3>
                    <p className="talk-speaker">
                      {talk.speaker}
                      {talk.speakerRole ? ` · ${talk.speakerRole}` : ""}
                    </p>
                    {count > 0 && (
                      <p className="subtitle">
                        {count} participante{count === 1 ? "" : "s"}
                      </p>
                    )}
                    <div className="talk-actions">
                      <Link className="button" to={`/talk/${talk.id}/join`}>
                        Entrar <span aria-hidden="true">→</span>
                      </Link>
                      <Link className="button button-outline" to={`/talk/${talk.id}/speak`}>
                        Sou orador
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
