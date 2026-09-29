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
): Promise<void> {
  return postJson("/broadcast", { sessionId, original, translations }, speakerToken);
}

export function announcePresence(sessionId: string): Promise<void> {
  return postJson("/presence", { sessionId });
}

export interface SpeechTokenResponse {
  token: string;
  region: string;
}

export async function getSpeechToken(talkId: string, speakerToken: string): Promise<SpeechTokenResponse> {
  const res = await fetch(`${API_BASE}/speechToken?talkId=${encodeURIComponent(talkId)}`, {
    headers: { "X-Speaker-Token": speakerToken },
  });
  if (!res.ok) throw new Error(`speechToken failed: ${res.status} ${await res.text()}`);
  return res.json();
}

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

export async function verifyPin(talkId: string, pin: string): Promise<{ token: string }> {
  return postJson("/verifyPin", { talkId, pin });
}

export function talkStarted(talkId: string, speakerToken: string): Promise<void> {
  return postJson("/talkStarted", { talkId }, speakerToken);
}

export function talkEnded(talkId: string, speakerToken: string): Promise<void> {
  return postJson("/talkEnded", { talkId }, speakerToken);
}

// navigator.sendBeacon can't set custom headers, so the token travels in the
// body — used as a best-effort signal when the speaker's tab closes.
export function talkEndedBeacon(talkId: string, speakerToken: string): void {
  const blob = new Blob([JSON.stringify({ talkId, token: speakerToken })], { type: "application/json" });
  navigator.sendBeacon(`${API_BASE}/talkEnded`, blob);
}
