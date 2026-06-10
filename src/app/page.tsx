"use client";

import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { Shell } from "@/components/Shell";
import { TankCard } from "@/components/TankCard";
import { FleetEStop } from "@/components/FleetEStop";
import { Led, Spinner } from "@/components/ui";
import { useTanksList } from "@/lib/hooks";
import { getData } from "@/lib/data";
import { useAuth, canManageTanks, canControl } from "@/lib/auth";
import { isOnline } from "@/lib/format";

function Overview() {
  const { tanks, loading } = useTanksList();
  const { user } = useAuth();

  const online = tanks.filter((t) => isOnline(t.reported?.lastSeen, t.reported?.online)).length;
  const alerts = tanks.reduce((s, t) => s + t.activeAlerts, 0);
  const avg =
    tanks.length > 0
      ? Math.round(tanks.reduce((s, t) => s + (t.reported?.levelPct ?? 0), 0) / tanks.length)
      : 0;

  const allowControl = canControl(user?.role);
  const stopped = tanks.filter((t) => t.config?.emergencyStop === true).length;
  const data = getData();
  const stopAll = () => Promise.all(tanks.map((t) => data.setEmergencyStop(t.tankId, true)));
  const resumeAll = () => Promise.all(tanks.map((t) => data.setEmergencyStop(t.tankId, false)));

  return (
    <Shell
      actions={
        <FleetEStop
          stopped={stopped}
          total={tanks.length}
          canControl={allowControl}
          onStopAll={stopAll}
          onResumeAll={resumeAll}
        />
      }
    >
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-ink">Flota de tanques</h1>
        <p className="text-[13px] text-ink-dim">monitoreo y control en tiempo real</p>
      </div>

      {/* banner de paro general */}
      {stopped > 0 && (
        <div
          className={`mb-5 flex items-center gap-3 rounded-lg border px-4 py-3 ${
            stopped === tanks.length ? "border-bad/50 bg-bad/10" : "border-bad/30 bg-bad/[0.06]"
          }`}
        >
          <Led tone="bad" pulse />
          <div className="text-[13px] text-bad">
            <span className="font-semibold">
              {stopped === tanks.length ? "Paro general activo" : `${stopped} en paro de emergencia`}
            </span>{" "}
            <span className="text-ink-dim">
              — actuadores bloqueados en{" "}
              {stopped === tanks.length
                ? "toda la flota"
                : `${stopped} tanque${stopped > 1 ? "s" : ""}`}{" "}
              hasta reanudar.
            </span>
          </div>
        </div>
      )}

      {/* resumen de la flota */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="tanques" value={tanks.length} tone="#d8dee6" />
        <Stat label="en línea" value={`${online}/${tanks.length}`} tone="#48b07f" />
        <Stat label="nivel medio" value={`${avg}%`} tone="#4b8ef0" />
        <Stat label="alertas" value={alerts} tone={alerts > 0 ? "#dd5a68" : "#69737f"} />
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Spinner label="Sincronizando flota…" />
        </div>
      ) : tanks.length === 0 ? (
        <Empty admin={canManageTanks(user?.role)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tanks.map((t) => (
            <TankCard key={t.tankId} t={t} />
          ))}
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="panel px-4 py-3">
      <div className="label mb-1">{label}</div>
      <div className="readout text-2xl font-semibold leading-none" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

function Empty({ admin }: { admin: boolean }) {
  return (
    <div className="panel grid place-items-center gap-3 py-16 text-center">
      <p className="text-sm text-ink-dim">No hay tanques asignados a tu usuario.</p>
      {admin && (
        <Link
          href="/settings/tanks"
          className="rounded-md border border-cyan/40 bg-cyan/10 px-4 py-2 text-[13px] font-medium text-cyan transition hover:bg-cyan/15"
        >
          Dar de alta un tanque
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthGate>
      <Overview />
    </AuthGate>
  );
}
