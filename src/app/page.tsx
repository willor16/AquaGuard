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
import { useCountUp } from "@/lib/useCountUp";

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
      <div className="mb-6 animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Flota de tanques</h1>
        <p className="mt-0.5 text-[13px] text-ink-dim">monitoreo y control en tiempo real</p>
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
        <Stat label="tanques" value={tanks.length} tone="#d8dee6" index={0} />
        <Stat label="en línea" value={online} total={tanks.length} tone="#48b07f" index={1} />
        <Stat label="nivel medio" value={avg} suffix="%" tone="#4b8ef0" index={2} />
        <Stat
          label="alertas"
          value={alerts}
          tone={alerts > 0 ? "#dd5a68" : "#69737f"}
          index={3}
        />
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Spinner label="Sincronizando flota…" />
        </div>
      ) : tanks.length === 0 ? (
        <Empty admin={canManageTanks(user?.role)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tanks.map((t, i) => (
            <TankCard key={t.tankId} t={t} index={i} />
          ))}
        </div>
      )}
    </Shell>
  );
}

function Stat({
  label,
  value,
  tone,
  suffix,
  total,
  index = 0,
}: {
  label: string;
  value: number;
  tone: string;
  suffix?: string;
  total?: number;
  index?: number;
}) {
  const n = useCountUp(value);
  return (
    <div
      className="panel animate-fade-up overflow-hidden px-4 py-3.5"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* filo de acento sutil arriba */}
      <span
        className="absolute inset-x-0 top-0 h-0.5 opacity-70"
        style={{ background: `linear-gradient(90deg, ${tone}00, ${tone}, ${tone}00)` }}
      />
      <div className="label mb-1.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <span
          className="readout text-3xl font-bold leading-none tracking-tight"
          style={{ color: tone }}
        >
          {Math.round(n)}
          {suffix && <span className="text-lg font-semibold opacity-70">{suffix}</span>}
        </span>
        {total !== undefined && (
          <span className="text-base font-semibold text-ink-faint">/{total}</span>
        )}
      </div>
    </div>
  );
}

function Empty({ admin }: { admin: boolean }) {
  return (
    <div className="panel animate-fade-up grid place-items-center gap-3 py-16 text-center">
      <p className="text-sm text-ink-dim">No hay tanques asignados a tu usuario.</p>
      {admin && (
        <Link
          href="/settings/tanks"
          className="rounded-lg border border-cyan/50 bg-cyan/10 px-4 py-2.5 text-[13px] font-semibold text-cyan transition-all duration-200 hover:bg-cyan/20 hover:border-cyan/70 active:scale-[0.98]"
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
