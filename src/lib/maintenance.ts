import type { MaintenanceWindow, TankConfig } from "@/lib/types";

export function maintenanceList(config?: TankConfig): MaintenanceWindow[] {
  if (!config?.maintenance) return [];
  return Object.values(config.maintenance).sort((a, b) => a.startTs - b.startTs);
}

/** Ventana de mantenimiento activa en `nowS` (epoch s), o null. */
export function activeMaintenance(
  config?: TankConfig,
  nowS: number = Math.floor(Date.now() / 1000)
): MaintenanceWindow | null {
  return (
    maintenanceList(config).find((w) => nowS >= w.startTs && nowS < w.endTs) ?? null
  );
}

/** Próxima ventana futura, o null. */
export function nextMaintenance(
  config?: TankConfig,
  nowS: number = Math.floor(Date.now() / 1000)
): MaintenanceWindow | null {
  return maintenanceList(config).find((w) => w.startTs > nowS) ?? null;
}

/** ¿El llenado automático está suspendido por una ventana activa? */
export function autoSuspended(
  config?: TankConfig,
  nowS?: number
): boolean {
  const w = activeMaintenance(config, nowS);
  return !!w && w.disableAuto;
}

export function fmtRange(w: MaintenanceWindow): string {
  const a = new Date(w.startTs * 1000);
  const b = new Date(w.endTs * 1000);
  const sameDay = a.toDateString() === b.toDateString();
  const d = (x: Date) =>
    x.toLocaleDateString("es-GT", { day: "2-digit", month: "short" });
  const hm = (x: Date) =>
    x.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
  return sameDay
    ? `${d(a)} · ${hm(a)}–${hm(b)}`
    : `${d(a)} ${hm(a)} → ${d(b)} ${hm(b)}`;
}

export function fmtDuration(w: MaintenanceWindow): string {
  const mins = Math.max(0, Math.round((w.endTs - w.startTs) / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
