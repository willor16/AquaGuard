"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, canManageTanks } from "@/lib/auth";
import { useTicker } from "@/lib/hooks";
import { clockTime } from "@/lib/format";
import { Led } from "./ui";
import type { ReactNode } from "react";

function IconDroplet() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5C8 1.5 3 6.5 3 10a5 5 0 0 0 10 0c0-3.5-5-8.5-5-8.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFleet() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10.5" y="2.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2.5" y="10.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10.5" y="10.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconTanks() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="3" y="2.5" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 10.5c2-1.4 3.5-1.4 5.5 0s4 1.4 6 0" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

type Item = { href: string; label: string; icon: ReactNode; active: boolean };

export function Shell({
  children,
  actions,
}: {
  children: ReactNode;
  /** Acciones de página (p. ej. paro de flota). Se muestran arriba del contenido. */
  actions?: ReactNode;
}) {
  const { user, mode, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTicker(1000);

  const nav: Item[] = [
    {
      href: "/",
      label: "flota",
      icon: <IconFleet />,
      active: pathname === "/" || pathname.startsWith("/tank"),
    },
  ];
  if (canManageTanks(user?.role)) {
    nav.push({
      href: "/settings/tanks",
      label: "tanques",
      icon: <IconTanks />,
      active: pathname.startsWith("/settings"),
    });
  }

  const onSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const sourceBadge = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{
        color: mode === "demo" ? "#d6a23e" : "#48b07f",
        background: mode === "demo" ? "#d6a23e1a" : "#48b07f1a",
      }}
    >
      <Led tone={mode === "demo" ? "warn" : "good"} pulse={mode !== "demo"} />
      {mode === "demo" ? "demo" : "firebase"}
    </span>
  );

  const brand = (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-cyan/15 text-cyan">
        <IconDroplet />
      </span>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight text-ink">AquaGuard</div>
        <div className="text-[10px] text-ink-faint">control de tanques</div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen lg:pl-60">
      {/* ── barra lateral (escritorio) ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-base-700 bg-base-900 lg:flex">
        <div className="border-b border-base-700 px-4 py-3.5">{brand}</div>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition ${
                it.active
                  ? "bg-cyan/12 font-medium text-cyan"
                  : "text-ink-dim hover:bg-base-800 hover:text-ink"
              }`}
            >
              <span className={it.active ? "text-cyan" : "text-ink-faint"}>{it.icon}</span>
              {it.label}
            </Link>
          ))}
        </nav>

        {/* pie: fuente de datos + usuario + salir */}
        <div className="space-y-3 border-t border-base-700 p-3">
          <div className="flex items-center justify-between px-1">
            {sourceBadge}
            <span className="tabular-nums text-[11px] text-ink-faint">
              {clockTime(Math.floor(t / 1000))}
            </span>
          </div>
          {user && (
            <div className="rounded-md border border-base-700 bg-base-850 px-3 py-2.5">
              <div className="truncate text-[12px] text-ink">{user.email}</div>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-[10px] capitalize text-cyan">{user.role}</span>
                <button
                  onClick={onSignOut}
                  className="text-[11px] text-ink-dim transition hover:text-bad"
                >
                  salir
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── barra superior (móvil) ── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-base-700 bg-base-850/90 px-4 py-2.5 backdrop-blur lg:hidden">
        {brand}
        <div className="ml-auto flex items-center gap-3">
          {sourceBadge}
          {user && (
            <button
              onClick={onSignOut}
              className="rounded-md border border-base-600 px-2.5 py-1.5 text-[12px] text-ink-dim transition hover:border-bad/50 hover:text-bad"
            >
              salir
            </button>
          )}
        </div>
      </header>

      {/* ── contenido ── */}
      <main className="mx-auto max-w-[1200px] px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
        {actions && (
          <div className="mb-5 flex flex-wrap items-center justify-end gap-2">{actions}</div>
        )}
        {children}
      </main>

      {/* ── navegación inferior (móvil) ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-base-700 bg-base-900/95 backdrop-blur lg:hidden">
        {nav.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition ${
              it.active ? "text-cyan" : "text-ink-dim"
            }`}
          >
            {it.icon}
            {it.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
