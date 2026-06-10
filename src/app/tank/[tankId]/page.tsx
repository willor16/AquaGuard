"use client";

import { useParams } from "next/navigation";
import { Instrument, Led, Metric, Spinner } from "@/components/ui";
import { TankGauge } from "@/components/TankGauge";
import { AlertPanel } from "@/components/AlertPanel";
import { LevelChart } from "@/components/LevelChart";
import { useTank, useHistory, useTicker } from "@/lib/hooks";
import { isOnline, relativeTime, fmt } from "@/lib/format";
import { activeMaintenance, nextMaintenance } from "@/lib/maintenance";
import Link from "next/link";

function Resumen({ tankId }: { tankId: string }) {
  const { tank, loading } = useTank(tankId);
  useTicker(1000);
  const history = useHistory(tankId);

  if (loading || !tank) {
    return (
      <div className="grid place-items-center py-16">
        <Spinner label="Cargando resumen…" />
      </div>
    );
  }

  const { config, reported, alerts } = tank;
  const online = isOnline(reported.lastSeen, reported.online);
  const sensorDeg = reported.sensorHealth?.status === "degraded";
  const maint = activeMaintenance(config);
  const maintNext = nextMaintenance(config);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* MEDIDOR */}
      <Instrument
        label="Nivel del tanque"
        right={
          <span className="text-[12px] text-ink-faint">{relativeTime(reported.lastSeen)}</span>
        }
      >
        <TankGauge
          levelPct={reported.levelPct}
          startPct={config.startPct}
          stopPct={config.stopPct}
          offline={!online}
        />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Metric label="distancia sensor" value={fmt(reported.distanceCm)} unit="cm" tone="cyan" />
          <Metric
            label="lectura"
            value={fmt(reported.levelPct)}
            unit="%"
            tone={reported.levelPct >= 98 ? "bad" : "cyan"}
          />
        </div>
      </Instrument>

      <div className="space-y-5">
        {/* estado del sistema */}
        <Instrument label="Estado del sistema">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatusCell
              label="conexión"
              value={online ? "en línea" : "sin conexión"}
              tone={online ? "good" : "bad"}
            />
            {config.actuators.pump.enabled && (
              <StatusCell
                label="cisterna"
                value={reported.cisternHasWater ? "con agua" : "vacía"}
                tone={reported.cisternHasWater ? "good" : "bad"}
              />
            )}
            <StatusCell
              label="sensor"
              value={sensorDeg ? "degradado" : "correcto"}
              tone={sensorDeg ? "warn" : "good"}
              sub={`±${fmt(reported.sensorHealth?.noiseStd)} σ`}
            />
            <StatusCell label="estrategia" value={config.actuationStrategy} tone="info" />
            <StatusCell
              label="mantenimiento"
              value={maint ? "en curso" : maintNext ? "programado" : "sin plan"}
              tone={maint ? "warn" : maintNext ? "info" : "good"}
              sub={
                maint
                  ? maint.title
                  : maintNext
                  ? new Date(maintNext.startTs * 1000).toLocaleDateString("es-GT", {
                      day: "2-digit",
                      month: "short",
                    })
                  : undefined
              }
            />
          </div>
        </Instrument>

        {/* alertas */}
        <Instrument label="Alertas activas">
          <AlertPanel alerts={alerts} />
        </Instrument>
      </div>

      {/* mini histórico — ocupa el ancho completo */}
      <div className="lg:col-span-2">
        <Instrument
          label="Tendencia de nivel · 30 min"
          right={
            <Link
              href={`/tank/${tankId}/history`}
              className="text-[12px] text-cyan transition hover:text-cyan-glow"
            >
              ver detalle →
            </Link>
          }
        >
          <LevelChart
            points={history}
            startPct={config.startPct}
            stopPct={config.stopPct}
            height={200}
          />
        </Instrument>
      </div>
    </div>
  );
}

function StatusCell({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "info";
  sub?: string;
}) {
  const c =
    tone === "good"
      ? "#48b07f"
      : tone === "warn"
      ? "#d6a23e"
      : tone === "bad"
      ? "#dd5a68"
      : "#5b93d6";
  return (
    <div className="rounded-md border border-base-700 bg-base-850 px-3.5 py-3">
      <div className="label mb-1.5 flex items-center gap-1.5">
        <Led tone={tone} size={7} pulse={tone === "bad"} />
        {label}
      </div>
      <div className="text-sm font-semibold capitalize" style={{ color: c }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-ink-faint">{sub}</div>}
    </div>
  );
}

export default function TankPage() {
  const params = useParams<{ tankId: string }>();
  return <Resumen tankId={params.tankId} />;
}
