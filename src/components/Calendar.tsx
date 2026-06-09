"use client";

import { useState } from "react";
import type { MaintenanceWindow } from "@/lib/types";

const WEEKDAYS = ["lu", "ma", "mi", "ju", "vi", "sa", "do"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return Math.floor(x.getTime() / 1000);
}

/** ¿La ventana intersecta el día [d, d+1)? */
function windowOnDay(w: MaintenanceWindow, dayStartS: number): boolean {
  const dayEndS = dayStartS + 86400;
  return w.startTs < dayEndS && w.endTs > dayStartS;
}

export function Calendar({
  windows,
  onPickDay,
  selectedDayS,
}: {
  windows: MaintenanceWindow[];
  onPickDay?: (dayStartS: number) => void;
  selectedDayS?: number | null;
}) {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const first = new Date(view.y, view.m, 1);
  // lunes = 0
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const todayS = startOfDay(today);

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">
          {MONTHS[view.m]} <span className="font-normal text-ink-faint">{view.y}</span>
        </span>
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => shift(-1)}>‹</NavBtn>
          <button
            onClick={() => setView({ y: today.getFullYear(), m: today.getMonth() })}
            className="rounded-md border border-base-600 px-2.5 py-1 text-[12px] text-ink-dim transition hover:border-cyan/50 hover:text-cyan"
          >
            hoy
          </button>
          <NavBtn onClick={() => shift(1)}>›</NavBtn>
        </div>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] text-ink-faint">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dayS = startOfDay(new Date(view.y, view.m, d));
          const isToday = dayS === todayS;
          const isPast = dayS < todayS;
          const isSelected = selectedDayS === dayS;
          const dayWindows = windows.filter((w) => windowOnDay(w, dayS));
          const hasMaint = dayWindows.length > 0;
          const isActive = dayWindows.some((w) => w.disableAuto);

          return (
            <button
              key={i}
              onClick={() => onPickDay?.(dayS)}
              className={`relative aspect-square rounded-md border p-1 text-left transition ${
                isSelected
                  ? "border-cyan/70 bg-cyan/10"
                  : hasMaint
                  ? "border-amber/40 bg-amber/[0.07] hover:border-amber/60"
                  : "border-base-700 hover:border-base-600"
              } ${isPast ? "opacity-55" : ""}`}
            >
              <span
                className={`text-[12px] tabular-nums ${
                  isToday ? "font-bold text-cyan" : hasMaint ? "text-amber" : "text-ink-dim"
                }`}
              >
                {d}
              </span>
              {isToday && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan" />
              )}
              {hasMaint && (
                <span className="absolute bottom-1 left-1 right-1 flex items-center gap-0.5">
                  {dayWindows.slice(0, 3).map((w, k) => (
                    <span
                      key={k}
                      className="h-1 flex-1 rounded-full"
                      style={{ background: isActive ? "#d6a23e" : "#d6a23e80" }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan" /> hoy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-amber/60" /> mantenimiento
        </span>
      </div>
    </div>
  );
}

function NavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md border border-base-600 text-ink-dim transition hover:border-cyan/50 hover:text-cyan"
    >
      {children}
    </button>
  );
}
