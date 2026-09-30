import type { Talk } from "./api";

export type TalkPhase = "upcoming" | "ongoing" | "ended";

// Purely informational — which talk is *scheduled* for this room right now,
// by wall-clock time. Sessions are per-room, not per-talk, so this doesn't
// reflect whether anyone is actually speaking.
export function findCurrentTalk(talks: Talk[], roomId: string, now: Date): Talk | undefined {
  return talks.find((t) => t.roomId === roomId && getPhase(t.startsAt, t.endsAt, now) === "ongoing");
}

export function getPhase(startsAt: string, endsAt: string, now: Date): TalkPhase {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const t = now.getTime();
  if (t < start) return "upcoming";
  if (t > end) return "ended";
  return "ongoing";
}

export function formatCountdown(startsAt: string, now: Date): string {
  const diffMs = new Date(startsAt).getTime() - now.getTime();
  if (diffMs <= 0) return "";

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `Começa em ${days}d ${hours}h`;
  if (hours > 0) return `Começa em ${hours}h ${minutes}m`;
  if (minutes > 0) return `Começa em ${minutes}m ${seconds}s`;
  return `Começa em ${seconds}s`;
}

export function formatTimeRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateLabel = start.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
  const timeFmt = (d: Date) => d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} · ${timeFmt(start)}–${timeFmt(end)}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

export type Period = "morning" | "afternoon" | "evening";

export function getPeriod(iso: string): Period {
  const hour = new Date(iso).getHours();
  if (hour < 13) return "morning";
  if (hour < 19) return "afternoon";
  return "evening";
}

export const PERIOD_LABELS: Record<Period, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
};

export const PERIOD_ACCENTS: Record<Period, string> = {
  morning: "#60a5fa",
  afternoon: "#bef264",
  evening: "#f0abfc",
};

// Each room in a breakout/parallel block gets its own accent colour (matching
// the reference event site), assigned by first-seen order rather than a
// hardcoded room id so it keeps working if rooms are renamed or added.
const ROOM_PALETTE = ["#60a5fa", "#bef264", "#2dd4bf", "#f0abfc", "#fb923c"];

export function getRoomColor(rooms: string[], roomId: string): string {
  const index = rooms.indexOf(roomId);
  return ROOM_PALETTE[index % ROOM_PALETTE.length] ?? ROOM_PALETTE[0];
}

export const TAG_LABELS: Record<string, string> = {
  host: "Host",
  keynote: "Keynote",
  roundtable: "Roundtable",
  talk: "Talk",
  break: "Pausa",
};

export function formatByline(speaker: string, role?: string): string {
  if (speaker && role) return `${speaker} · ${role}`;
  return speaker || role || "";
}
