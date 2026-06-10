"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { label: string; href: string; active: (p: string, base: string) => boolean };

export function TankTabs({
  tankId,
  canConfigure,
}: {
  tankId: string;
  canConfigure: boolean;
}) {
  const pathname = usePathname();
  const base = `/tank/${tankId}`;

  const tabs: Tab[] = [
    { label: "resumen", href: base, active: (p, b) => p === b },
    { label: "control", href: `${base}/control`, active: (p, b) => p === b },
    { label: "histórico", href: `${base}/history`, active: (p, b) => p === b },
    { label: "mantenimiento", href: `${base}/maintenance`, active: (p, b) => p === b },
  ];
  if (canConfigure) {
    tabs.push({ label: "configuración", href: `${base}/config`, active: (p, b) => p === b });
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav className="flex min-w-max gap-1 border-b border-base-700">
        {tabs.map((tab) => {
          const on = tab.active(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`-mb-px border-b-2 px-3.5 py-2.5 text-[13px] transition ${
                on
                  ? "border-cyan font-medium text-cyan"
                  : "border-transparent text-ink-dim hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
