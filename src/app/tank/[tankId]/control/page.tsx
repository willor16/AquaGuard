"use client";

import { useParams } from "next/navigation";
import { Instrument, Spinner } from "@/components/ui";
import { ActuatorControl, ModeSwitch } from "@/components/ActuatorControl";
import { EmergencyStop } from "@/components/EmergencyStop";
import { useTank, useTicker } from "@/lib/hooks";
import { getData } from "@/lib/data";
import { useAuth, canControl } from "@/lib/auth";
import { isOnline } from "@/lib/format";
import { activeMaintenance } from "@/lib/maintenance";
import type { Mode } from "@/lib/types";

function Control({ tankId }: { tankId: string }) {
  const { tank, loading } = useTank(tankId);
  const { user } = useAuth();
  useTicker(1000);

  if (loading || !tank) {
    return (
      <div className="grid place-items-center py-16">
        <Spinner label="Cargando control…" />
      </div>
    );
  }

  const { config, desired, reported } = tank;
  const online = isOnline(reported.lastSeen, reported.online);
  const allowControl = canControl(user?.role);
  const data = getData();

  const setMode = (m: Mode) => data.writeDesired(tankId, { requestedMode: m });
  const cmdPump = (v: boolean) => data.writeDesired(tankId, { pumpManual: v });
  const cmdValve = (v: boolean) => data.writeDesired(tankId, { valveManual: v });

  const targetMode = desired.requestedMode ?? reported.mode;

  // seguridad y mantenimiento
  const eStop = config.emergencyStop === true;
  const maint = activeMaintenance(config);
  const autoPaused = !!maint && maint.disableAuto;
  const ctrlOnline = online && !eStop;
  const ctrlAllowed = allowControl && !eStop;

  return (
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
  );
}

export default function ControlPage() {
  const params = useParams<{ tankId: string }>();
  return <Control tankId={params.tankId} />;
}
