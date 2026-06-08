import { OFFLINE_THRESHOLD_S } from "@/lib/types";

export function isOnline(lastSeen?: number, online?: boolean): boolean {
  if (typeof online === "boolean" && !online) return false;
  if (!lastSeen) return false;
  const now = Math.floor(Date.now() / 1000);
  return now - lastSeen <= OFFLINE_THRESHOLD_S;
}

export function relativeTime(ts: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - ts);
  if (diff < 5) return "ahora";
  if (diff < 60) return `hace ${diff} s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

export function clockTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function fmt(n: number | undefined, decimals = 1): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "--";
  return n.toFixed(decimals);
}
