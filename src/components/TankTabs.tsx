"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function TankTabs({
  tankId,
  canConfigure,
}: {
  tankId: string;
  canConfigure: boolean;
}) {
  const pathname = usePathname();
  const base = `/tank/${tankId}`;

  const tabs = [
    { label: "resumen", href: base },
    { label: "control", href: `${base}/control` },
    { label: "histórico", href: `${base}/history` },
    { label: "mantenimiento", href: `${base}/maintenance` },
    ...(canConfigure ? [{ label: "calibración", href: `${base}/calibration` }] : []),
    ...(canConfigure ? [{ label: "configuración", href: `${base}/config` }] : []),
  ];

  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.href === pathname)
  );

  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [ind, setInd] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const measure = () => {
    const el = itemRefs.current[activeIndex];
    const nav = navRef.current;
    if (!el || !nav) return;
    setInd({ left: el.offsetLeft, width: el.offsetWidth });
    // mantén la pestaña activa a la vista en móvil
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  useLayoutEffect(measure, [activeIndex, tabs.length]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <div className="scroll-x -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div ref={navRef} className="relative flex min-w-max gap-1 border-b border-base-700">
        {tabs.map((tab, i) => {
          const on = i === activeIndex;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={`relative px-3.5 py-2.5 text-[13px] transition-colors duration-200 ${
                on ? "font-medium text-cyan" : "text-ink-dim hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
        {/* indicador deslizante */}
        <span
          className="absolute -bottom-px h-0.5 rounded-full bg-cyan transition-all duration-300 ease-smooth"
          style={{ left: ind.left, width: ind.width }}
        />
      </div>
    </div>
  );
}
