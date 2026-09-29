import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { HubConnection } from "@microsoft/signalr";
import { getAgenda, joinGroup, type AgendaResponse } from "../lib/api";
import { connect } from "../lib/signalr";

interface TalkStatusPayload {
  talkId: string;
  live: boolean;
}

interface ParticipantJoinedPayload {
  talkId: string;
}

export default function HomePage() {
  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveTalks, setLiveTalks] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Record<string, number>>({});
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    getAgenda()
      .then(setAgenda)
      .catch(() => setError("Não foi possível carregar a agenda."));
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
        connection.on("participantJoined", ({ talkId }: ParticipantJoinedPayload) => {
          setParticipants((prev) => ({ ...prev, [talkId]: (prev[talkId] ?? 0) + 1 }));
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
                return (
                  <li key={talk.id} className="talk-card">
                    <div className="talk-card-header">
                      <span className="talk-time">{talk.time}</span>
                      {live && (
                        <span className="status-badge is-live">
                          <span className="status-dot" />
                          Ao vivo
                        </span>
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
