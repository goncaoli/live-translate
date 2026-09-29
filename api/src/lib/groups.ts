export function groupName(sessionId: string, lang: string): string {
  return `${sessionId}:${lang}`;
}
