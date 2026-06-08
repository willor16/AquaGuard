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
    lvl >= 98 ? "#ff4d5e" : lvl <= t.config?.startPct ? "#ffb020" : "#2ee6d6";
  const eStop = t.config?.emergencyStop === true;
  const maint = activeMaintenance(t.config);

  return (
    <Link
      href={`/tank/${t.tankId}`}
      className="panel group relative block overflow-hidden p-0 transition hover:border-cyan/40 hover:shadow-glow"
    >
      <span className="corner left-0 top-0 rounded-tl-xl border-l border-t opacity-0 transition group-hover:opacity-100" />
      <span className="corner right-0 top-0 rounded-tr-xl border-r border-t opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{t.meta?.name}</div>
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {t.meta?.location || t.tankId}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {eStop ? (
            <Pill tone="bad">✕ paro</Pill>
          ) : maint ? (
            <Pill tone="warn">⚒ mant</Pill>
          ) : null}
          <Led tone={online ? "good" : "bad"} pulse={online} />
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
              online ? "text-good" : "text-bad"
            }`}
          >
            {online ? "online" : "offline"}
          </span>
        </div>
      </div>

      {/* nivel */}
      <div className="flex items-end gap-3 px-4 pt-3">
        <div className="readout text-4xl font-bold leading-none" style={{ color: lvlTone }}>
          {lvl}
          <span className="text-lg text-ink-faint">%</span>
        </div>
        <div className="flex-1 pb-1">
          <div className="h-2.5 overflow-hidden rounded-full border border-base-700 bg-base-900">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${lvl}%`,
                background: `linear-gradient(to right, ${lvlTone}88, ${lvlTone})`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-faint">
            <span>on {t.config?.startPct}%</span>
            <span>off {t.config?.stopPct}%</span>
          </div>
        </div>
      </div>

      {/* pie: modo + actuadores + alertas */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-base-700/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Pill tone={r?.mode === "auto" ? "cyan" : "info"}>{r?.mode ?? "—"}</Pill>
          {t.config?.actuators?.pump?.enabled && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-dim">
              <Led tone={r?.pumpOn ? "good" : "idle"} size={7} /> bomba
            </span>
          )}
          {t.config?.actuators?.valve?.enabled && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-dim">
              <Led tone={r?.valveOn ? "good" : "idle"} size={7} /> válvula
            </span>
          )}
        </div>
        {t.activeAlerts > 0 ? (
          <Pill tone="bad">⚠ {t.activeAlerts}</Pill>
        ) : (
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
            {online ? relativeTime(r.lastSeen) : "sin señal"}
          </span>
        )}
      </div>
    </Link>
  );
}
