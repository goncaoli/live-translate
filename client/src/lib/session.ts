import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export function createSessionId(): string {
  return nanoid();
}

export function joinUrl(sessionId: string): string {
  return `${window.location.origin}/join/${sessionId}`;
}
