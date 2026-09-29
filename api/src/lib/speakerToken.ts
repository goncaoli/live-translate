import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 12 * 60 * 60; // covers a full event day

function secret(): string {
  const value = process.env.SPEAKER_TOKEN_SECRET;
  if (!value) throw new Error("SPEAKER_TOKEN_SECRET is not configured");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function signToken(talkId: string): string {
  const expiry = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${talkId}.${expiry}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined | null, talkId: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenTalkId, expiryStr, signature] = parts;
  if (tokenTalkId !== talkId) return false;

  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;

  const expectedSignature = sign(`${tokenTalkId}.${expiryStr}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function pinMatches(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
