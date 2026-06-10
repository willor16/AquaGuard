"use client";

import Link from "next/link";
import { Led, Pill, Spinner } from "@/components/ui";
import { EmergencyStop } from "@/components/EmergencyStop";
import { TankTabs } from "@/components/TankTabs";
import { useTank, useTicker } from "@/lib/hooks";
import { getData } from "@/lib/data";
import { useAuth, canControl, canConfigure } from "@/lib/auth";
import { isOnline, relativeTime } from "@/lib/format";
import { activeMaintenance, fmtRange } from "@/lib/maintenance";
import type { ReactNode } from "react";

export function TankChrome({ tankId, children }: { tankId: string; children: ReactNode }) {
  const { tank, loading } = useTank(tankId);
  const { user } = useAuth();
  useTicker(1000); // recalcula online/offline y tiempos

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner label="Conectando con el tanque…" />
      </div>
    );
  }
  if (!tank) {
    return (
      <div className="panel grid place-items-center gap-2 py-20 text-center">
        <p className="text-sm text-ink-dim">Tanque no encontrado: {tankId}</p>
        <Link href="/" className="text-[13px] text-cyan">
          ← volver a la flota
        </Link>
      </div>
    );
  }

  const { config, reported } = tank;
  const online = isOnline(reported.lastSeen, reported.online);
  const allowControl = canControl(user?.role);
  const data = getData();

  const eStop = config.emergencyStop === true;
  const maint = activeMaintenance(config);
  const autoPaused = !!maint && maint.disableAuto;

  return (
    <div className="space-y-5">
      {/* cabecera del tanque */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{tank.meta.name}</h1>
          <p className="text-[13px] text-ink-dim">
            {tank.meta.location || tankId} ·{" "}
            <span className="text-ink-faint">id: {tankId}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={online ? "good" : "idle"}>
            <Led tone={online ? "good" : "idle"} pulse={online} size={7} />
            {online ? "en línea" : "fuera de línea"}
          </Pill>
          <Pill tone={reported.mode === "auto" ? "cyan" : "info"}>{reported.mode}</Pill>
        </div>
      </div>

      {/* pestañas de navegación del tanque */}
      <TankTabs tankId={tankId} canConfigure={canConfigure(user?.role)} />

      {/* banner paro de emergencia */}
      {eStop && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-bad/50 bg-bad/10 px-4 py-3">
          <div className="flex items-center gap-3 text-[13px]">
            <Led tone="bad" pulse />
            <span className="text-bad">
              <span className="font-semibold">Paro de emergencia activo</span>{" "}
              <span className="text-ink-dim">
                — todos los actuadores están bloqueados hasta reanudar la operación.
              </span>
            </span>
          </div>
          <EmergencyStop
            active
            canControl={allowControl}
            onStop={() => data.setEmergencyStop(tankId, true)}
            onResume={() => data.setEmergencyStop(tankId, false)}
          />
        </div>
      )}

      {/* banner mantenimiento en curso */}
      {!eStop && autoPaused && (
        <div className="flex items-center gap-3 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-[13px]">
          <Led tone="warn" pulse />
          <span className="text-amber">
            <span className="font-semibold">Mantenimiento en curso</span> · {maint!.title}{" "}
            <span className="text-ink-dim">
              — llenado automático en pausa ({fmtRange(maint!)}).
            </span>
          </span>
        </div>
      )}

      {/* banner offline */}
      {!eStop && online === false && (
        <div className="flex items-center gap-3 rounded-lg border border-base-700 bg-base-800 px-4 py-3 text-[13px]">
          <Led tone="idle" />
          <span className="text-ink-dim">
            <span className="font-semibold text-ink">Dispositivo sin conexión</span> — último
            reporte {relativeTime(reported.lastSeen)}. Los controles están deshabilitados; el equipo
            opera localmente con sus protecciones.
          </span>
        </div>
      )}

      {children}
    </div>
  );
}
