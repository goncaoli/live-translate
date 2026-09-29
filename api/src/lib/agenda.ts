export interface Room {
  id: string;
  name: string;
}

export interface Talk {
  id: string;
  roomId: string;
  title: string;
  speaker: string;
  speakerRole?: string;
  // ISO 8601 with explicit offset, e.g. "2026-10-07T10:00:00+01:00" — lets
  // the client show a live countdown and time range without guessing the
  // event's timezone.
  startsAt: string;
  endsAt: string;
  pin: string;
}

// Edit this file to set up the real event. `id` must be unique across all
// talks (it doubles as the SignalR session id and the URL slug). `pin` is
// never sent to the client — see api/src/functions/agenda.ts.
export const ROOMS: Room[] = [
  { id: "auditorio-principal", name: "Auditório Principal" },
  { id: "sala-b", name: "Sala B" },
];

const EVENT_PIN = "1500180"; // código postal da empresa — partilhado por todas as palestras

export const TALKS: Talk[] = [
  {
    id: "ia-generativa-enterprise",
    roomId: "auditorio-principal",
    title: "IA Generativa em Contexto Enterprise",
    speaker: "Ana Martins",
    speakerRole: "CTO, Exemplo Corp",
    startsAt: "2026-10-07T10:00:00+01:00",
    endsAt: "2026-10-07T10:40:00+01:00",
    pin: EVENT_PIN,
  },
  {
    id: "futuro-do-trabalho",
    roomId: "auditorio-principal",
    title: "O Futuro do Trabalho com Agentes Autónomos",
    speaker: "João Ferreira",
    speakerRole: "Investigador, Universidade Exemplo",
    startsAt: "2026-10-07T11:00:00+01:00",
    endsAt: "2026-10-07T11:40:00+01:00",
    pin: EVENT_PIN,
  },
  {
    id: "scaling-ai-startups",
    roomId: "sala-b",
    title: "Escalar Startups de IA em Portugal",
    speaker: "Rita Costa",
    speakerRole: "Founder, Exemplo Ventures",
    startsAt: "2026-10-07T10:00:00+01:00",
    endsAt: "2026-10-07T10:40:00+01:00",
    pin: EVENT_PIN,
  },
];

export function findTalk(talkId: string): Talk | undefined {
  return TALKS.find((t) => t.id === talkId);
}
