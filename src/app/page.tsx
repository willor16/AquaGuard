"use client";

import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { Shell } from "@/components/Shell";
import { TankCard } from "@/components/TankCard";
import { Spinner } from "@/components/ui";
import { useTanksList } from "@/lib/hooks";
import { useAuth, canManageTanks } from "@/lib/auth";
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

  return (
    <Shell
      actions={
        canManageTanks(user?.role) && (
          <Link
            href="/settings/tanks"
            className="rounded-md border border-cyan/40 bg-cyan/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan transition hover:bg-cyan/15"
          >
            + gestionar tanques
          </Link>
        )
      }
    >
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
