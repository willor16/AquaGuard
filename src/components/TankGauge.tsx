"use client";

import { useEffect, useState } from "react";
import { useCountUp } from "@/lib/useCountUp";

interface Props {
  levelPct: number;
  startPct: number;
  stopPct: number;
  /** offline → agua apagada en gris */
  offline?: boolean;
  height?: number;
}

export function TankGauge({
  levelPct,
  startPct,
  stopPct,
  offline = false,
  height = 300,
}: Props) {
  const lvl = Math.max(0, Math.min(100, levelPct));
  const lvlAnim = useCountUp(lvl);
  const overflow = lvl >= 98;
  const low = lvl <= startPct;

  // el agua sube desde 0 al montar y sigue suavemente los cambios en vivo
  const [fillH, setFillH] = useState(0);
  useEffect(() => setFillH(lvl), [lvl]);

  const waterTop = offline ? "#3a4554" : overflow ? "#dd5a68" : "#4b8ef0";
  const waterBot = offline ? "#252c37" : overflow ? "#9c3b46" : "#2f6bd4";

  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);

  return (
    <div className="flex items-stretch gap-3" style={{ height }}>
      {/* escala graduada */}
      <div className="relative w-8 shrink-0">
        {ticks.map((tk) => (
          <div
            key={tk}
            className="absolute right-0 flex items-center gap-1"
            style={{ bottom: `calc(${tk}% - 0.5px)`, transform: "translateY(50%)" }}
          >
            {tk % 20 === 0 && (
              <span className="tabular-nums text-[9px] text-ink-faint">{tk}</span>
            )}
            <span
              className="block h-px bg-base-600"
              style={{ width: tk % 20 === 0 ? 8 : 5 }}
            />
          </div>
        ))}
      </div>

      {/* cuerpo del tanque */}
      <div className="relative flex-1">
        <div className="relative h-full w-full overflow-hidden rounded-xl border border-base-600 bg-base-900">
          {/* agua */}
          <div
            className="absolute inset-x-0 bottom-0 ease-out"
            style={{
              height: `${fillH}%`,
              background: `linear-gradient(to top, ${waterBot}, ${waterTop})`,
              transition: "height 900ms cubic-bezier(0.22, 1, 0.36, 1), background 400ms ease",
            }}
          >
            {/* superficie del agua: línea limpia y definida, sin oleaje */}
            {lvl > 0 && (
              <div
                className="absolute inset-x-0 top-0"
                style={{
                  height: 2,
                  background: offline ? "#5a6675" : overflow ? "#f08593" : "#8fc0ff",
                  boxShadow: offline
                    ? "none"
                    : `0 0 10px ${overflow ? "#dd5a68" : "#4b8ef0"}, 0 1px 0 rgba(255,255,255,0.25)`,
                }}
              />
            )}
          </div>

          {/* marcadores de umbral */}
          <ThresholdLine pct={stopPct} label={`off ${stopPct}`} tone="#d6a23e" />
          <ThresholdLine pct={startPct} label={`on ${startPct}`} tone="#48b07f" />

          {/* lectura grande superpuesta */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center transition-opacity duration-500">
            <div
              className="readout text-5xl font-bold leading-none tracking-tight"
              style={{
                color: offline ? "#9aa6b4" : "#ffffff",
                textShadow: "0 2px 12px rgba(0,0,0,0.7), 0 0 20px rgba(75,142,240,0.12)",
                letterSpacing: "-0.02em",
              }}
            >
              {lvlAnim.toFixed(0)}
              <span className="text-2xl font-semibold text-ink-dim">%</span>
            </div>
          </div>

          {offline && (
            <div className="absolute inset-x-0 bottom-3 text-center text-[11px] text-ink-faint">
              señal perdida
            </div>
          )}
        </div>

        {/* estado bajo el medidor */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[12px] font-medium transition-all duration-300 h-5">
          {low && !offline && (
            <span className="text-good animate-fade-in">● nivel bajo · llenando</span>
          )}
          {overflow && (
            <span className="text-bad animate-fade-in">● sobrenivel</span>
          )}
          {!low && !overflow && <span className="text-ink-faint h-0 opacity-0">—</span>}
        </div>
      </div>
    </div>
  );
}

function ThresholdLine({ pct, label, tone }: { pct: number; label: string; tone: string }) {
  return (
    <div
      className="absolute inset-x-0 flex items-center pointer-events-none"
      style={{
        bottom: `${pct}%`,
        transform: "translateY(50%)",
      }}
    >
      {/* línea con contorno oscuro: destaca tanto sobre el agua como sobre el fondo */}
      <div
        className="relative h-[3px] flex-1"
        style={{
          background: tone,
          // halo oscuro arriba/abajo para separar la línea del agua de fondo
          boxShadow: `0 0 0 1px rgba(0,0,0,0.55), 0 0 6px rgba(0,0,0,0.6)`,
        }}
      />
      <span
        className="ml-2 rounded-md px-2 py-1 text-[11px] font-bold tabular-nums whitespace-nowrap"
        style={{
          color: "#0c0f14",
          background: tone,
          boxShadow: `0 1px 4px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.3)`,
          letterSpacing: "0.3px",
        }}
      >
        {label}
      </span>
    </div>
  );
}
