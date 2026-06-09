"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { Shell } from "@/components/Shell";
import { Instrument, Metric, Spinner } from "@/components/ui";
import { LevelChart } from "@/components/LevelChart";
import { useTank, useHistory } from "@/lib/hooks";
import { clockTime } from "@/lib/format";
import type { EventType } from "@/lib/types";

const EVENT_META: Record<EventType, { icon: string; color: string; label: string }> = {
  PUMP_ON: { icon: "▲", color: "#48b07f", label: "Bomba encendida" },
  PUMP_OFF: { icon: "▽", color: "#69737f", label: "Bomba apagada" },
  VALVE_ON: { icon: "▲", color: "#48b07f", label: "Válvula abierta" },
  VALVE_OFF: { icon: "▽", color: "#69737f", label: "Válvula cerrada" },
  ALERT: { icon: "!", color: "#dd5a68", label: "Alerta" },
  MODE_CHANGE: { icon: "⇄", color: "#5b93d6", label: "Cambio de modo" },
  CONFIG_CHANGE: { icon: "⚙", color: "#4b8ef0", label: "Configuración" },
  ESTOP_ON: { icon: "✕", color: "#dd5a68", label: "Paro de emergencia" },
  ESTOP_OFF: { icon: "⟲", color: "#48b07f", label: "Operación reanudada" },
  MAINT_START: { icon: "⚒", color: "#d6a23e", label: "Mantenimiento iniciado" },
  MAINT_END: { icon: "⚒", color: "#69737f", label: "Mantenimiento finalizado" },
};

function History({ tankId }: { tankId: string }) {
  const { tank, loading } = useTank(tankId);
  const points = useHistory(tankId);

  const stats = useMemo(() => {
    if (points.length === 0) return { min: 0, max: 0, avg: 0 };
    const vals = points.map((p) => p.levelPct);
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    };
  }, [points]);

  const events = useMemo(() => {
    if (!tank) return [];
    return Object.entries(tank.events)
      .map(([id, e]) => ({ id, ...e }))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 50);
  }, [tank]);

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner label="Cargando histórico…" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink">Histórico · {tank?.meta.name}</h1>
        <p className="text-[13px] text-ink-dim">tendencia de nivel y bitácora de eventos</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="mínimo" value={stats.min.toFixed(0)} unit="%" tone="warn" />
        <Metric label="promedio" value={stats.avg.toFixed(1)} unit="%" tone="cyan" />
        <Metric label="máximo" value={stats.max.toFixed(0)} unit="%" tone="good" />
      </div>

      <Instrument label="Nivel en el tiempo">
        <LevelChart
          points={points}
          startPct={tank?.config.startPct}
          stopPct={tank?.config.stopPct}
          height={300}
        />
      </Instrument>

      <Instrument label={`Bitácora de eventos · ${events.length}`}>
        {events.length === 0 ? (
          <p className="py-6 text-center font-mono text-xs text-ink-faint">sin eventos registrados</p>
        ) : (
          <ul className="divide-y divide-base-700/60">
            {events.map((e) => {
              const m = EVENT_META[e.type] ?? EVENT_META.CONFIG_CHANGE;
              return (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md border text-sm"
                    style={{ borderColor: `${m.color}40`, color: m.color, background: `${m.color}10` }}
                  >
                    {m.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-ink">{m.label}</span>
                    {e.detail && (
                      <span className="ml-2 font-mono text-[11px] text-ink-faint">{e.detail}</span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-faint">
                    {clockTime(e.ts)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Instrument>
    </div>
  );
}

export default function HistoryPage() {
  const params = useParams<{ tankId: string }>();
  return (
    <AuthGate>
      <Shell back={{ href: `/tank/${params.tankId}`, label: "tanque" }} title="histórico">
        <History tankId={params.tankId} />
      </Shell>
    </AuthGate>
  );
}
