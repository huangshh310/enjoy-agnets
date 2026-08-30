export function relativeTime(timestamp: number, now = Date.now()): string {
  const deltaMs = Math.max(0, now - timestamp);
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}
