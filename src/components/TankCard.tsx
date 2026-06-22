"use client";

import Link from "next/link";
import { Led, Pill } from "./ui";
import { isOnline, relativeTime } from "@/lib/format";
import { activeMaintenance } from "@/lib/maintenance";
import { useCountUp } from "@/lib/useCountUp";
import type { TankSummary } from "@/lib/types";

export function TankCard({ t, index = 0 }: { t: TankSummary; index?: number }) {
  const r = t.reported;
  const online = isOnline(r?.lastSeen, r?.online);
  const lvl = Math.round(r?.levelPct ?? 0);
  const lvlAnim = useCountUp(lvl);
  const lvlTone =
    lvl >= 98 ? "#dd5a68" : lvl <= (t.config?.startPct ?? 0) ? "#d6a23e" : "#4b8ef0";
  const eStop = t.config?.emergencyStop === true;
  const maint = activeMaintenance(t.config);
  const uncalibrated =
    !t.config?.calibration?.ultrasonic?.isCalibrated ||
    !t.config?.calibration?.moisture?.isCalibrated;

  return (
    <Link
      href={`/tank/${t.tankId}`}
      style={{ animationDelay: `${index * 70}ms` }}
      className="panel panel-interactive animate-fade-up block p-4 transition-all duration-300 hover:border-cyan/40 hover:shadow-card-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-bold text-ink">{t.meta?.name}</div>
          <div className="truncate text-[12px] text-ink-faint">
            {t.meta?.location || t.tankId}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {eStop ? (
            <Pill tone="bad">paro</Pill>
          ) : maint ? (
            <Pill tone="warn">mant.</Pill>
          ) : uncalibrated ? (
            <Pill tone="warn">sin calibrar</Pill>
          ) : null}
          <span
            className={`inline-flex items-center gap-1.5 text-[12px] transition-colors duration-300 ${
              online ? "text-good" : "text-ink-faint"
            }`}
          >
            <Led tone={online ? "good" : "idle"} ping={online} />
            {online ? "en línea" : "fuera"}
          </span>
        </div>
      </div>

      {/* nivel */}
      <div className="mt-4 flex items-end gap-4">
        <div className="readout text-4xl font-bold leading-none tracking-tight" style={{ color: lvlTone }}>
          {Math.round(lvlAnim)}
          <span className="text-lg font-semibold text-ink-faint">%</span>
        </div>
        <div className="flex-1 pb-1">
          <div className="h-2.5 overflow-hidden rounded-full bg-base-800 shadow-inner">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out shadow-sm"
              style={{
                width: `${lvl}%`,
                background: lvlTone,
                boxShadow: `0 0 8px ${lvlTone}44`,
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-medium text-ink-faint">
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
