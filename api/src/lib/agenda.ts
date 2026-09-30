export interface Room {
  id: string;
  name: string;
}

export type TalkType = "host" | "keynote" | "roundtable" | "talk" | "break";

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
  type?: TalkType;
}

// Edit this file to set up the real event. `id` must be unique across all
// talks (it's used as the URL slug for schedule display purposes — the
// live translation session itself is keyed by roomId, not talk id).
export const ROOMS: Room[] = [
  { id: "tribuna-presidencial", name: "Tribuna Presidencial" },
  { id: "sala-campeoes-europeus", name: "Sala Campeões Europeus" },
  { id: "sala-taca-latina", name: "Sala Taça Latina" },
];

// Shared across every room's speak session. Never sent to the client — see
// api/src/functions/agenda.ts and api/src/functions/verifyPin.ts.
export const EVENT_PIN = "1500180"; // código postal da empresa
const DAY = "2026-10-07";
const at = (time: string) => `${DAY}T${time}:00+01:00`;

export const TALKS: Talk[] = [
  // Manhã — Plenary Sessions, 09:00–13:15, Tribuna Presidencial
  {
    id: "abertura-opening",
    roomId: "tribuna-presidencial",
    title: "Abertura / Opening",
    speaker: "",
    speakerRole: "Welcome remarks and the day ahead",
    startsAt: at("09:00"),
    endsAt: at("09:15"),
    type: "host",
  },
  {
    id: "ministro-adjunto-reforma-estado",
    roomId: "tribuna-presidencial",
    title: "Ministro Adjunto e da Reforma do Estado em Representação do Primeiro Ministro",
    speaker: "",
    startsAt: at("09:15"),
    endsAt: at("09:45"),
    type: "keynote",
  },
  {
    id: "joana-carrasqueira-google-deepmind",
    roomId: "tribuna-presidencial",
    title: "Scaling AI Beyond Pilots",
    speaker: "Joana Carrasqueira",
    speakerRole: "Google DeepMind",
    startsAt: at("09:45"),
    endsAt: at("10:05"),
    type: "keynote",
  },
  {
    id: "digital-core-supply-chain-aws",
    roomId: "tribuna-presidencial",
    title: "Digital Core for Intelligent Operations and Supply Chain Continuity",
    speaker: "",
    speakerRole: "Resilient operations, powered by AI — Powered by AWS",
    startsAt: at("10:05"),
    endsAt: at("10:35"),
    type: "roundtable",
  },
  {
    id: "coffee-break-demo",
    roomId: "tribuna-presidencial",
    title: "Coffee Break and Demo Experience",
    speaker: "",
    startsAt: at("10:35"),
    endsAt: at("10:55"),
    type: "break",
  },
  {
    id: "acceler8-roberta-medina",
    roomId: "tribuna-presidencial",
    title: "Acceler8 with Roberta Medina",
    speaker: "Roberta Medina",
    speakerRole: "8 minutes, 1 idea on AI",
    startsAt: at("10:55"),
    endsAt: at("11:05"),
    type: "talk",
  },
  {
    id: "agentic-breakpoint-microsoft",
    roomId: "tribuna-presidencial",
    title: "The Agentic Breakpoint: From Hype to Realism",
    speaker: "",
    speakerRole: "Resetting expectations for agentic AI — Powered by Microsoft",
    startsAt: at("11:05"),
    endsAt: at("11:35"),
    type: "roundtable",
  },
  {
    id: "acceler8-henrique-gouveia-melo",
    roomId: "tribuna-presidencial",
    title: "Acceler8 with Almirante Henrique Gouveia e Melo",
    speaker: "Almirante Henrique Gouveia e Melo",
    speakerRole: "8 minutes, 1 idea on AI",
    startsAt: at("11:35"),
    endsAt: at("11:45"),
    type: "talk",
  },
  {
    id: "data-ai-trust-google-cloud",
    roomId: "tribuna-presidencial",
    title: "Data & AI Trust",
    speaker: "",
    speakerRole: "Governance, transparency, explainability at scale — Powered by Google Cloud",
    startsAt: at("11:45"),
    endsAt: at("12:15"),
    type: "roundtable",
  },
  {
    id: "acceler8-tomas-appleton",
    roomId: "tribuna-presidencial",
    title: "Acceler8 with Tomás Appleton",
    speaker: "Tomás Appleton",
    speakerRole: "8 minutes, 1 idea on AI",
    startsAt: at("12:15"),
    endsAt: at("12:25"),
    type: "talk",
  },
  {
    id: "customer-360-salesforce",
    roomId: "tribuna-presidencial",
    title: "Customer 360 in the AI Era",
    speaker: "",
    speakerRole: "From data to real-time decision — Powered by Salesforce",
    startsAt: at("12:25"),
    endsAt: at("12:55"),
    type: "roundtable",
  },
  {
    id: "keynote-tba",
    roomId: "tribuna-presidencial",
    title: "Keynote to Be Announced",
    speaker: "",
    startsAt: at("12:55"),
    endsAt: at("13:15"),
    type: "keynote",
  },

  // Tarde — Breakout Sessions, 14:20–16:00, três salas em paralelo
  {
    id: "afternoon-opening",
    roomId: "tribuna-presidencial",
    title: "Afternoon Opening",
    speaker: "",
    speakerRole: "The programme resumes with an introduction to the three breakout sessions, across three rooms.",
    startsAt: at("14:20"),
    endsAt: at("14:30"),
    type: "host",
  },

  // Slot 14:40–15:00
  {
    id: "ai-engine-growth-productivity",
    roomId: "tribuna-presidencial",
    title: "AI as an Engine of Growth: Productivity, Competitiveness and New Models of Economic Value",
    speaker: "",
    startsAt: at("14:40"),
    endsAt: at("15:00"),
  },
  {
    id: "breakout-aws-tbc-1",
    roomId: "sala-campeoes-europeus",
    title: "Powered by AWS — To Be Confirmed",
    speaker: "",
    startsAt: at("14:40"),
    endsAt: at("15:00"),
  },
  {
    id: "democratizing-agentic-ai",
    roomId: "sala-taca-latina",
    title: "Democratizing Agentic AI: Public Sector, Businesses and Society",
    speaker: "",
    speakerRole: "Ensuring AI benefits everyone",
    startsAt: at("14:40"),
    endsAt: at("15:00"),
  },

  // Slot 15:10–15:30
  {
    id: "orchestrating-agents-ibm",
    roomId: "tribuna-presidencial",
    title: "Orchestrating Agents: Multiplying Results",
    speaker: "",
    speakerRole: "From single agents to coordinated fleets — Powered by IBM",
    startsAt: at("15:10"),
    endsAt: at("15:30"),
  },
  {
    id: "healthcare-agentic-ai-portugal",
    roomId: "sala-campeoes-europeus",
    title: "The Next Generation of Healthcare in Portugal with Agentic AI",
    speaker: "",
    speakerRole: "Powered by Google Cloud",
    startsAt: at("15:10"),
    endsAt: at("15:30"),
  },
  {
    id: "ai-sovereignty-cybersecurity",
    roomId: "sala-taca-latina",
    title: "AI and Agentic AI in the Age of Sovereignty and Cybersecurity",
    speaker: "",
    speakerRole: "Digital sovereignty as a strategic choice",
    startsAt: at("15:10"),
    endsAt: at("15:30"),
  },

  // Slot 15:40–16:00
  {
    id: "transformation-no-longer-waits",
    roomId: "tribuna-presidencial",
    title: "Transformation No Longer Waits for Anyone",
    speaker: "",
    speakerRole: "Powered by ServiceNow",
    startsAt: at("15:40"),
    endsAt: at("16:00"),
  },
  {
    id: "breakout-microsoft-tbc",
    roomId: "sala-campeoes-europeus",
    title: "Powered by Microsoft — To Be Confirmed",
    speaker: "",
    startsAt: at("15:40"),
    endsAt: at("16:00"),
  },
  {
    id: "agentic-ai-sentinel",
    roomId: "sala-taca-latina",
    title: "Agentic AI: Sentinel of the 21st Century",
    speaker: "",
    startsAt: at("15:40"),
    endsAt: at("16:00"),
  },
];

export function findRoom(roomId: string): Room | undefined {
  return ROOMS.find((r) => r.id === roomId);
}
