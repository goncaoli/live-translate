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
  time: string;
  pin: string;
}

// Edit this file to set up the real event. `id` must be unique across all
// talks (it doubles as the SignalR session id and the URL slug). `pin` is
// never sent to the client — see api/src/functions/agenda.ts.
export const ROOMS: Room[] = [
  { id: "auditorio-principal", name: "Auditório Principal" },
  { id: "sala-b", name: "Sala B" },
];

export const TALKS: Talk[] = [
  {
    id: "ia-generativa-enterprise",
    roomId: "auditorio-principal",
    title: "IA Generativa em Contexto Enterprise",
    speaker: "Ana Martins",
    speakerRole: "CTO, Exemplo Corp",
    time: "10:00 – 10:40",
    pin: "1234",
  },
  {
    id: "futuro-do-trabalho",
    roomId: "auditorio-principal",
    title: "O Futuro do Trabalho com Agentes Autónomos",
    speaker: "João Ferreira",
    speakerRole: "Investigador, Universidade Exemplo",
    time: "11:00 – 11:40",
    pin: "5678",
  },
  {
    id: "scaling-ai-startups",
    roomId: "sala-b",
    title: "Escalar Startups de IA em Portugal",
    speaker: "Rita Costa",
    speakerRole: "Founder, Exemplo Ventures",
    time: "10:00 – 10:40",
    pin: "4321",
  },
];

export function findTalk(talkId: string): Talk | undefined {
  return TALKS.find((t) => t.id === talkId);
}
