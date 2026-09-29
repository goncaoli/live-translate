const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

export function broadcast(sessionId: string, original: string, translations: TranslationMap): Promise<void> {
  return postJson("/broadcast", { sessionId, original, translations });
}

export interface SpeechTokenResponse {
  token: string;
  region: string;
}

export async function getSpeechToken(): Promise<SpeechTokenResponse> {
  const res = await fetch(`${API_BASE}/speechToken`);
  if (!res.ok) throw new Error(`speechToken failed: ${res.status} ${await res.text()}`);
  return res.json();
}
