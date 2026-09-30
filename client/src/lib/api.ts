const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function postJson<T>(path: string, body: unknown, speakerToken?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (speakerToken) headers["X-Speaker-Token"] = speakerToken;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface SignalRConnectionInfo {
  url: string;
  accessToken: string;
}

export function negotiate(sessionId: string): Promise<SignalRConnectionInfo> {
  return postJson("/negotiate", { sessionId });
}

export function joinGroup(connectionId: string, sessionId: string, lang: string): Promise<void> {
  return postJson("/joinGroup", { connectionId, sessionId, lang });
}

export type TranslationMap = Record<string, string>;

export function broadcast(
  sessionId: string,
  original: string,
  translations: TranslationMap,
  speakerToken: string,
  isFinal: boolean,
): Promise<void> {
  return postJson("/broadcast", { sessionId, original, translations, isFinal }, speakerToken);
}

export function announcePresence(sessionId: string): Promise<void> {
  return postJson("/presence", { sessionId });
}

export function announceLeave(sessionId: string): Promise<void> {
  return postJson("/leave", { sessionId });
}

// navigator.sendBeacon best-effort signal for when the viewer's tab closes
// without the SPA getting a chance to run its normal cleanup.
export function announceLeaveBeacon(sessionId: string): void {
  const blob = new Blob([JSON.stringify({ sessionId })], { type: "application/json" });
  navigator.sendBeacon(`${API_BASE}/leave`, blob);
}

export interface SpeechTokenResponse {
  token: string;
  region: string;
}

export async function getSpeechToken(roomId: string, speakerToken: string): Promise<SpeechTokenResponse> {
  const res = await fetch(`${API_BASE}/speechToken?roomId=${encodeURIComponent(roomId)}`, {
    headers: { "X-Speaker-Token": speakerToken },
  });
  if (!res.ok) throw new Error(`speechToken failed: ${res.status} ${await res.text()}`);
  return res.json();
}

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
  startsAt: string;
  endsAt: string;
  type?: TalkType;
}

export interface AgendaResponse {
  rooms: Room[];
  talks: Talk[];
}

export async function getAgenda(): Promise<AgendaResponse> {
  const res = await fetch(`${API_BASE}/agenda`);
  if (!res.ok) throw new Error(`agenda failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function verifyPin(roomId: string, pin: string): Promise<{ token: string }> {
  return postJson("/verifyPin", { roomId, pin });
}

export function roomStarted(roomId: string, speakerToken: string, sourceLanguage: string): Promise<void> {
  return postJson("/roomStarted", { roomId, sourceLanguage }, speakerToken);
}

export function roomEnded(roomId: string, speakerToken: string): Promise<void> {
  return postJson("/roomEnded", { roomId }, speakerToken);
}

// navigator.sendBeacon can't set custom headers, so the token travels in the
// body — used as a best-effort signal when the speaker's tab closes.
export function roomEndedBeacon(roomId: string, speakerToken: string): void {
  const blob = new Blob([JSON.stringify({ roomId, token: speakerToken })], { type: "application/json" });
  navigator.sendBeacon(`${API_BASE}/roomEnded`, blob);
}
