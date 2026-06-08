"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTicker } from "@/lib/hooks";
import { clockTime } from "@/lib/format";
import { Led } from "./ui";
import type { ReactNode } from "react";

export function Shell({
  children,
  back,
  title,
  actions,
}: {
  children: ReactNode;
  back?: { href: string; label: string };
  title?: ReactNode;
  actions?: ReactNode;
}) {
  const { user, mode, signOut } = useAuth();
  const router = useRouter();
  const t = useTicker(1000);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-base-700/70 bg-base-850/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
          {/* marca */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="grid h-8 w-8 place-items-center rounded-md border border-cyan/40 bg-cyan/10 font-mono text-cyan shadow-glow">
              ◈
            </span>
            <div className="leading-none">
              <div className="font-mono text-sm font-bold tracking-[0.18em] text-ink">
                TANK<span className="text-cyan">·</span>CTRL
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-ink-faint">
                supervisión hídrica
              </div>
            </div>
          </Link>

          {back && (
            <>
              <span className="text-base-600">/</span>
              <Link
                href={back.href}
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim transition hover:text-cyan"
              >
                ← {back.label}
              </Link>
            </>
          )}
          {title && (
            <>
              <span className="text-base-600">/</span>
              <span className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
                {title}
              </span>
            </>
          )}

          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            {actions}
            {/* badge de fuente de datos */}
            <span
              className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] sm:inline-flex"
              style={{
                borderColor: mode === "demo" ? "#ffb02055" : "#22c98a55",
                color: mode === "demo" ? "#ffb020" : "#22c98a",
                background: mode === "demo" ? "#ffb02012" : "#22c98a12",
              }}
            >
              <Led tone={mode === "demo" ? "warn" : "good"} pulse />
              {mode === "demo" ? "modo demo" : "firebase"}
            </span>

            {/* reloj */}
            <span className="hidden font-mono text-xs tabular-nums text-ink-dim md:block">
              {clockTime(Math.floor(t / 1000))}
            </span>

            {/* usuario */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden text-right leading-none sm:block">
                  <div className="font-mono text-[11px] text-ink">{user.email}</div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan/80">
                    {user.role}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await signOut();
                    router.push("/login");
                  }}
                  className="rounded-md border border-base-600 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim transition hover:border-bad/50 hover:text-bad"
                >
                  salir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
