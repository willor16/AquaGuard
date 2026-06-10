"use client";

import Link from "next/link";
import { Led, Pill } from "./ui";
import { isOnline, relativeTime } from "@/lib/format";
import { activeMaintenance } from "@/lib/maintenance";
import type { TankSummary } from "@/lib/types";

export function TankCard({ t }: { t: TankSummary }) {
  const r = t.reported;
  const online = isOnline(r?.lastSeen, r?.online);
  const lvl = Math.round(r?.levelPct ?? 0);
  const lvlTone =
    lvl >= 98 ? "#dd5a68" : lvl <= (t.config?.startPct ?? 0) ? "#d6a23e" : "#4b8ef0";
  const eStop = t.config?.emergencyStop === true;
  const maint = activeMaintenance(t.config);

  return (
    <Link
      href={`/tank/${t.tankId}`}
      className="panel panel-interactive animate-fade-up block p-4 hover:border-cyan/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{t.meta?.name}</div>
          <div className="truncate text-[12px] text-ink-faint">
            {t.meta?.location || t.tankId}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {eStop ? (
            <Pill tone="bad">paro</Pill>
          ) : maint ? (
            <Pill tone="warn">mant.</Pill>
          ) : null}
          <span
            className={`inline-flex items-center gap-1.5 text-[12px] ${
              online ? "text-good" : "text-ink-faint"
            }`}
          >
            <Led tone={online ? "good" : "idle"} ping={online} />
            {online ? "en línea" : "fuera"}
          </span>
        </div>
      </div>

      {/* nivel */}
      <div className="mt-4 flex items-end gap-3">
        <div className="readout text-4xl font-semibold leading-none" style={{ color: lvlTone }}>
          {lvl}
          <span className="text-lg text-ink-faint">%</span>
        </div>
        <div className="flex-1 pb-1">
          <div className="h-2 overflow-hidden rounded-full bg-base-900">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${lvl}%`, background: lvlTone }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink-faint">
            <span>on {t.config?.startPct}%</span>
            <span>off {t.config?.stopPct}%</span>
          </div>
        </div>
      </div>

      {/* pie: modo + actuadores + alertas */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-base-700 pt-3">
        <div className="flex items-center gap-3 text-[12px] text-ink-dim">
          <Pill tone={r?.mode === "auto" ? "cyan" : "info"}>{r?.mode ?? "—"}</Pill>
          {t.config?.actuators?.pump?.enabled && (
            <span className="flex items-center gap-1.5">
              <Led tone={r?.pumpOn ? "good" : "idle"} size={7} /> bomba
            </span>
          )}
          {t.config?.actuators?.valve?.enabled && (
            <span className="flex items-center gap-1.5">
              <Led tone={r?.valveOn ? "good" : "idle"} size={7} /> válvula
            </span>
          )}
        </div>
        {t.activeAlerts > 0 ? (
          <Pill tone="bad">{t.activeAlerts} alerta{t.activeAlerts > 1 ? "s" : ""}</Pill>
        ) : (
          <span className="text-[11px] text-ink-faint">
            {online ? relativeTime(r.lastSeen) : "sin señal"}
          </span>
        )}
      </div>
    </Link>
  );
}
