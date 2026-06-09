"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { Shell } from "@/components/Shell";
import { Instrument, Led, Metric, Pill, Spinner } from "@/components/ui";
import { TankGauge } from "@/components/TankGauge";
import { ActuatorControl, ModeSwitch } from "@/components/ActuatorControl";
import { AlertPanel } from "@/components/AlertPanel";
import { LevelChart } from "@/components/LevelChart";
import { EmergencyStop } from "@/components/EmergencyStop";
import { useTank, useHistory, useTicker } from "@/lib/hooks";
import { getData } from "@/lib/data";
import { useAuth, canControl, canConfigure } from "@/lib/auth";
import { isOnline, relativeTime, fmt } from "@/lib/format";
import { activeMaintenance, nextMaintenance, fmtRange } from "@/lib/maintenance";
import type { Mode } from "@/lib/types";

const navLink =
  "rounded-md border border-base-600 px-3 py-1.5 text-[12px] text-ink-dim transition hover:border-cyan/50 hover:text-cyan";

function Dashboard({ tankId }: { tankId: string }) {
  const { tank, loading } = useTank(tankId);
  const { user } = useAuth();
  useTicker(1000); // recalcula online/offline y tiempos
  const history = useHistory(tankId);

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

  const { config, desired, reported, alerts } = tank;
  const online = isOnline(reported.lastSeen, reported.online);
  const allowControl = canControl(user?.role);
  const data = getData();

  const setMode = (m: Mode) => data.writeDesired(tankId, { requestedMode: m });
  const cmdPump = (v: boolean) => data.writeDesired(tankId, { pumpManual: v });
  const cmdValve = (v: boolean) => data.writeDesired(tankId, { valveManual: v });

  const targetMode = desired.requestedMode ?? reported.mode;
  const sensorDeg = reported.sensorHealth?.status === "degraded";

  // seguridad y mantenimiento
  const eStop = config.emergencyStop === true;
  const maint = activeMaintenance(config);
  const maintNext = nextMaintenance(config);
  const autoPaused = !!maint && maint.disableAuto;
  // los controles quedan bloqueados por paro de emergencia
  const ctrlOnline = online && !eStop;
  const ctrlAllowed = allowControl && !eStop;

  return (
    <div className="space-y-5">
      {/* cabecera del tanque */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{tank.meta.name}</h1>
          <p className="text-[13px] text-ink-dim">
            {tank.meta.location || tankId} · <span className="text-ink-faint">id: {tankId}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={online ? "good" : "idle"}>
            <Led tone={online ? "good" : "idle"} pulse={online} size={7} />
            {online ? "en línea" : "fuera de línea"}
          </Pill>
          <Pill tone={reported.mode === "auto" ? "cyan" : "info"}>{reported.mode}</Pill>
          <Link href={`/tank/${tankId}/history`} className={navLink}>
            histórico
          </Link>
          <Link href={`/tank/${tankId}/maintenance`} className={navLink}>
            mantenimiento
          </Link>
          {canConfigure(user?.role) && (
            <Link href={`/tank/${tankId}/config`} className={navLink}>
              configurar
            </Link>
          )}
        </div>
      </div>

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
            <span className="text-ink-dim">— llenado automático en pausa ({fmtRange(maint!)}).</span>
          </span>
        </div>
      )}

      {/* banner offline */}
      {!eStop && online === false && (
        <div className="flex items-center gap-3 rounded-lg border border-base-700 bg-base-800 px-4 py-3 text-[13px]">
          <Led tone="idle" />
          <span className="text-ink-dim">
            <span className="font-semibold text-ink">Dispositivo sin conexión</span> — último reporte{" "}
            {relativeTime(reported.lastSeen)}. Los controles están deshabilitados; el equipo opera
            localmente con sus protecciones.
          </span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* MEDIDOR */}
        <Instrument
          label="Nivel del tanque"
          right={<span className="text-[12px] text-ink-faint">{relativeTime(reported.lastSeen)}</span>}
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

        {/* CONTROL + ESTADO */}
        <div className="space-y-5">
          {/* control */}
          <Instrument
            label="Control remoto"
            right={
              <ModeSwitch
                mode={targetMode}
                reportedMode={reported.mode}
                online={ctrlOnline}
                canControl={ctrlAllowed}
                onChange={setMode}
              />
            }
          >
            {/* barra de seguridad */}
            {allowControl && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-base-700 bg-base-850 px-3 py-2.5">
                <span className="label">seguridad</span>
                {!eStop ? (
                  <EmergencyStop
                    active={false}
                    canControl={allowControl}
                    onStop={() => data.setEmergencyStop(tankId, true)}
                    onResume={() => data.setEmergencyStop(tankId, false)}
                  />
                ) : (
                  <span className="text-[12px] text-bad">
                    sistema en paro · usa el banner superior para reanudar
                  </span>
                )}
              </div>
            )}

            {!allowControl && (
              <div className="mb-3 rounded-md border border-dashed border-base-700 px-3 py-2 text-center text-[12px] text-ink-faint">
                rol de solo lectura · sin control
              </div>
            )}

            {autoPaused && reported.mode === "auto" && !eStop && (
              <div className="mb-3 rounded-md border border-amber/40 bg-amber/[0.07] px-3 py-2 text-center text-[12px] text-amber">
                llenado automático en pausa por mantenimiento
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {config.actuators.pump.enabled && (
                <ActuatorControl
                  kind="pump"
                  reportedOn={reported.pumpOn}
                  mode={reported.mode}
                  online={ctrlOnline}
                  canControl={ctrlAllowed}
                  relayChannel={config.actuators.pump.relayChannel}
                  onCommand={cmdPump}
                />
              )}
              {config.actuators.valve.enabled && (
                <ActuatorControl
                  kind="valve"
                  reportedOn={reported.valveOn}
                  mode={reported.mode}
                  online={ctrlOnline}
                  canControl={ctrlAllowed}
                  relayChannel={config.actuators.valve.relayChannel}
                  onCommand={cmdValve}
                />
              )}
              {!config.actuators.pump.enabled && !config.actuators.valve.enabled && (
                <div className="col-span-full rounded-md border border-dashed border-base-700 px-3 py-4 text-center text-[12px] text-ink-faint">
                  sin actuadores habilitados · configúralos en ajustes
                </div>
              )}
            </div>
          </Instrument>

          {/* estado del sistema */}
          <Instrument label="Estado del sistema">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatusCell label="conexión" value={online ? "en línea" : "sin conexión"} tone={online ? "good" : "bad"} />
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
      </div>

      {/* mini histórico */}
      <Instrument
        label="Tendencia de nivel · 30 min"
        right={
          <Link href={`/tank/${tankId}/history`} className="text-[12px] text-cyan transition hover:text-cyan-glow">
            ver detalle →
          </Link>
        }
      >
        <LevelChart points={history} startPct={config.startPct} stopPct={config.stopPct} height={200} />
      </Instrument>
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
    tone === "good" ? "#48b07f" : tone === "warn" ? "#d6a23e" : tone === "bad" ? "#dd5a68" : "#5b93d6";
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
  return (
    <AuthGate>
      <Shell back={{ href: "/", label: "flota" }} title={params.tankId}>
        <Dashboard tankId={params.tankId} />
      </Shell>
    </AuthGate>
  );
}
