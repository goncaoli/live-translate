export type TalkPhase = "upcoming" | "ongoing" | "ended";

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
