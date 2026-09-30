export function joinUrl(roomId: string): string {
  return `${window.location.origin}/room/${roomId}/join`;
}
