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
  const stopAll = () =>
    Promise.all(tanks.map((t) => data.setEmergencyStop(t.tankId, true)));
  const resumeAll = () =>
    Promise.all(tanks.map((t) => data.setEmergencyStop(t.tankId, false)));

  return (
    <Shell
      actions={
        <>
          <FleetEStop
            stopped={stopped}
            total={tanks.length}
            canControl={allowControl}
            onStopAll={stopAll}
            onResumeAll={resumeAll}
          />
          {canManageTanks(user?.role) && (
            <Link
              href="/settings/tanks"
              className="rounded-md border border-cyan/40 bg-cyan/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan transition hover:bg-cyan/15"
            >
              + gestionar tanques
            </Link>
          )}
        </>
      }
    >
      {/* banner de paro general */}
      {stopped > 0 && (
        <div
          className={`mb-4 flex items-center gap-3 rounded-lg border-2 px-4 py-3 ${
            stopped === tanks.length
              ? "border-bad/60 bg-bad/15 shadow-glow-bad"
              : "border-bad/40 bg-bad/10"
          }`}
        >
          <Led tone="bad" pulse />
          <div className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-bad">
            {stopped === tanks.length ? "paro general activo" : `${stopped} en paro de emergencia`}{" "}
            <span className="font-normal normal-case tracking-normal text-ink-dim">
              — actuadores bloqueados en {stopped === tanks.length ? "toda la flota" : `${stopped} tanque${stopped > 1 ? "s" : ""}`} hasta reanudar.
            </span>
          </div>
        </div>
      )}

      {/* barra de estado de la flota */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="tanques" value={tanks.length} tone="#d6e0ee" />
        <Stat label="en línea" value={`${online}/${tanks.length}`} tone="#22c98a" />
        <Stat label="nivel medio" value={`${avg}%`} tone="#2ee6d6" />
        <Stat label="alertas" value={alerts} tone={alerts > 0 ? "#ff4d5e" : "#5b6678"} />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span className="label-cyan">flota de tanques</span>
        <span className="h-px flex-1 bg-base-700" />
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
      <div className="readout text-2xl font-bold leading-none" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

function Empty({ admin }: { admin: boolean }) {
  return (
    <div className="panel grid place-items-center gap-3 py-16 text-center">
      <span className="font-mono text-3xl text-ink-faint">◌</span>
      <p className="font-mono text-sm text-ink-dim">No hay tanques asignados a tu usuario.</p>
      {admin && (
        <Link
          href="/settings/tanks"
          className="rounded-md border border-cyan/40 bg-cyan/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-cyan transition hover:bg-cyan/15"
        >
          + dar de alta un tanque
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
