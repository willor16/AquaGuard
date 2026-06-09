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
      <header className="sticky top-0 z-30 border-b border-base-700 bg-base-850/90 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          {/* marca */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-cyan/15 text-cyan">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M8 1.5C8 1.5 3 6.5 3 10a5 5 0 0 0 10 0c0-3.5-5-8.5-5-8.5Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-ink">
                AquaGuard
              </div>
              <div className="text-[10px] text-ink-faint">control de tanques</div>
            </div>
          </Link>

          {/* miga de pan */}
          {(back || title) && (
            <nav className="flex min-w-0 items-center gap-2 text-[13px] text-ink-dim">
              <span className="text-base-600">/</span>
              {back && (
                <Link href={back.href} className="transition hover:text-cyan">
                  {back.label}
                </Link>
              )}
              {title && (
                <>
                  {back && <span className="text-base-600">/</span>}
                  <span className="truncate text-ink">{title}</span>
                </>
              )}
            </nav>
          )}

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {actions}

            {/* fuente de datos */}
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

            {/* reloj */}
            <span className="hidden tabular-nums text-[13px] text-ink-dim md:block">
              {clockTime(Math.floor(t / 1000))}
            </span>

            {/* usuario */}
            {user && (
              <div className="flex items-center gap-2.5">
                <div className="hidden text-right leading-tight sm:block">
                  <div className="max-w-[160px] truncate text-[12px] text-ink">
                    {user.email}
                  </div>
                  <div className="text-[10px] capitalize text-cyan">{user.role}</div>
                </div>
                <button
                  onClick={async () => {
                    await signOut();
                    router.push("/login");
                  }}
                  className="rounded-md border border-base-600 px-2.5 py-1.5 text-[12px] text-ink-dim transition hover:border-bad/50 hover:text-bad"
                >
                  salir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
