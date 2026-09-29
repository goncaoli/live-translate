import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { HubConnection } from "@microsoft/signalr";
import { getAgenda, joinGroup, type AgendaResponse, type Talk } from "../lib/api";
import { connect } from "../lib/signalr";
import {
  formatByline,
  formatCountdown,
  formatTime,
  getPeriod,
  getPhase,
  PERIOD_LABELS,
  TAG_LABELS,
  type Period,
} from "../lib/countdown";

interface TalkStatusPayload {
  talkId: string;
  live: boolean;
}

interface ParticipantPayload {
  talkId: string;
}

function groupByPeriod(talks: Talk[]): Map<Period, Talk[]> {
  const groups = new Map<Period, Talk[]>();
  for (const talk of talks) {
    const period = getPeriod(talk.startsAt);
    const list = groups.get(period) ?? [];
    list.push(talk);
    groups.set(period, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  return groups;
}

const PERIOD_ORDER: Period[] = ["morning", "afternoon", "evening"];

export default function HomePage() {
  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveTalks, setLiveTalks] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => new Date());
  const [collapsed, setCollapsed] = useState<Set<Period>>(new Set());
  const [activeRoom, setActiveRoom] = useState<Partial<Record<Period, string>>>({});
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

  const periods = useMemo(() => {
    if (!agenda) return [];
    const grouped = groupByPeriod(agenda.talks);
    return PERIOD_ORDER.filter((p) => grouped.has(p)).map((period) => ({
      period,
      talks: grouped.get(period) as Talk[],
    }));
  }, [agenda]);

  function togglePeriod(period: Period) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });
  }

  function roomName(roomId: string): string {
    return agenda?.rooms.find((r) => r.id === roomId)?.name ?? roomId;
  }

  return (
    <div className="page page-wide">
      <div className="hero">
        <div className="hero-orb" aria-hidden="true" />
        <span className="eyebrow">Bem-vindo a</span>
        <h1>Live Translate</h1>
        <p className="subtitle">Escolhe uma palestra para ouvir a tradução em tempo real no teu telemóvel.</p>
      </div>

      {error && <p className="error">{error}</p>}
      {!agenda && !error && <p className="empty-state">A carregar agenda…</p>}

      {periods.map(({ period, talks }) => {
        const rooms = [...new Set(talks.map((t) => t.roomId))];
        const isCollapsed = collapsed.has(period);
        const selectedRoom = rooms.length > 1 ? (activeRoom[period] ?? rooms[0]) : null;
        const visibleTalks = selectedRoom ? talks.filter((t) => t.roomId === selectedRoom) : talks;
        const start = formatTime(talks[0].startsAt);
        const end = formatTime(talks[talks.length - 1].endsAt);

        return (
          <section key={period} className="period-section">
            <button className="period-header" onClick={() => togglePeriod(period)}>
              <div>
                <span className={`period-label period-${period}`}>{PERIOD_LABELS[period]}</span>
                <div className="period-time">
                  {start} – {end}
                </div>
              </div>
              <span className="period-count-badge">
                <strong>{talks.length}</strong>
                <span>sessões</span>
                <span className={`chevron ${isCollapsed ? "is-collapsed" : ""}`} aria-hidden="true">
                  ⌄
                </span>
              </span>
            </button>

            {!isCollapsed && (
              <>
                {rooms.length > 1 && (
                  <div className="room-tabs">
                    {rooms.map((roomId) => (
                      <button
                        key={roomId}
                        className={`room-tab ${selectedRoom === roomId ? "is-active" : ""}`}
                        onClick={() => setActiveRoom((prev) => ({ ...prev, [period]: roomId }))}
                      >
                        {roomName(roomId)}
                      </button>
                    ))}
                  </div>
                )}

                <ul className="timeline-list">
                  {visibleTalks.map((talk) => {
                    const live = liveTalks.has(talk.id);
                    const count = participants[talk.id] ?? 0;
                    const phase = getPhase(talk.startsAt, talk.endsAt, now);

                    return (
                      <li key={talk.id} className={`timeline-item ${talk.type ? `tag-${talk.type}` : ""}`}>
                        <div className="timeline-time">
                          {formatTime(talk.startsAt)}
                          <br />
                          {formatTime(talk.endsAt)}
                        </div>
                        <div className="timeline-body">
                          <div className="timeline-header">
                            {talk.type && <span className={`tag tag-${talk.type}`}>{TAG_LABELS[talk.type]}</span>}
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
                          <h3 className="timeline-title">{talk.title}</h3>
                          {(talk.speaker || talk.speakerRole) && (
                            <p className="timeline-meta">{formatByline(talk.speaker, talk.speakerRole)}</p>
                          )}
                          {count > 0 && (
                            <p className="subtitle">
                              {count} participante{count === 1 ? "" : "s"}
                            </p>
                          )}
                          {talk.type !== "break" && (
                            <div className="talk-actions">
                              <Link className="button" to={`/talk/${talk.id}/join`}>
                                Entrar <span aria-hidden="true">→</span>
                              </Link>
                              <Link className="button button-outline" to={`/talk/${talk.id}/speak`}>
                                Sou orador
                              </Link>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
