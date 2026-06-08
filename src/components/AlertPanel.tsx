"use client";

import { Led } from "./ui";
import { relativeTime } from "@/lib/format";
import type { Alert, AlertCode } from "@/lib/types";

const SEVERITY: Record<AlertCode, { tone: "bad" | "warn" | "info"; title: string }> = {
  DRY_RUN: { tone: "bad", title: "Marcha en seco" },
  OVERFLOW: { tone: "bad", title: "Sobrenivel" },
  NO_PRESSURE: { tone: "warn", title: "Sin presión de red" },
  SENSOR_FAULT: { tone: "warn", title: "Falla de sensor" },
  OFFLINE: { tone: "info", title: "Dispositivo sin conexión" },
};

export function AlertPanel({ alerts }: { alerts: Record<string, Alert> }) {
  const active = Object.entries(alerts)
    .filter(([, a]) => a.active)
    .sort((a, b) => b[1].ts - a[1].ts);

  if (active.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-good/25 bg-good/5 px-3.5 py-3">
        <Led tone="good" />
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-good">
          sin alertas · sistema nominal
        </span>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {active.map(([id, a]) => {
        const sev = SEVERITY[a.code] ?? { tone: "warn" as const, title: a.code };
        const c =
          sev.tone === "bad" ? "#ff4d5e" : sev.tone === "warn" ? "#ffb020" : "#4aa3ff";
        return (
          <li
            key={id}
            className="flex items-start gap-3 rounded-lg border px-3.5 py-3 animate-fade-up"
            style={{ borderColor: `${c}40`, background: `${c}0d` }}
          >
            <span className="mt-0.5">
              <Led tone={sev.tone} pulse />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold" style={{ color: c }}>
                  {sev.title}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  {a.code}
                </span>
              </div>
              <div className="mt-0.5 text-sm text-ink-dim">{a.message}</div>
              <div className="mt-1 font-mono text-[10px] text-ink-faint">
                {relativeTime(a.ts)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
