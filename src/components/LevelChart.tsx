"use client";

import { useMemo } from "react";
import type { HistoryPoint } from "@/lib/types";

/** Gráfica de nivel en SVG, estilo osciloscopio. Sin dependencias externas. */
export function LevelChart({
  points,
  startPct,
  stopPct,
  height = 260,
}: {
  points: HistoryPoint[];
  startPct?: number;
  stopPct?: number;
  height?: number;
}) {
  const W = 800;
  const H = height;
  const padL = 34;
  const padB = 22;
  const padT = 10;
  const padR = 10;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const { path, area, lastX, lastY, xLabels } = useMemo(() => {
    if (points.length < 2) {
      return { path: "", area: "", lastX: 0, lastY: 0, xLabels: [] as { x: number; t: string }[] };
    }
    const t0 = points[0].ts;
    const t1 = points[points.length - 1].ts;
    const span = Math.max(1, t1 - t0);
    const x = (ts: number) => padL + ((ts - t0) / span) * plotW;
    const y = (v: number) => padT + (1 - v / 100) * plotH;

    let d = "";
    points.forEach((p, i) => {
      d += `${i === 0 ? "M" : "L"}${x(p.ts).toFixed(1)} ${y(p.levelPct).toFixed(1)} `;
    });
    const last = points[points.length - 1];
    const a =
      d +
      `L${x(last.ts).toFixed(1)} ${(padT + plotH).toFixed(1)} ` +
      `L${padL} ${(padT + plotH).toFixed(1)} Z`;

    const labels: { x: number; t: string }[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const ts = t0 + (span * i) / steps;
      labels.push({
        x: x(ts),
        t: new Date(ts * 1000).toLocaleTimeString("es-GT", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }
    return { path: d.trim(), area: a, lastX: x(last.ts), lastY: y(last.levelPct), xLabels: labels };
  }, [points, plotW, plotH, padL, padT]);

  const yFor = (v: number) => padT + (1 - v / 100) * plotH;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id="lvlFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4b8ef0" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#4b8ef0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* rejilla horizontal + escala Y */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={padL}
              x2={W - padR}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={yFor(v) + 3}
              textAnchor="end"
              className="fill-ink-faint"
              style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
            >
              {v}
            </text>
          </g>
        ))}

        {/* umbrales */}
        {stopPct !== undefined && (
          <>
            <line x1={padL} x2={W - padR} y1={yFor(stopPct)} y2={yFor(stopPct)} stroke="#d6a23e" strokeWidth={2} opacity={0.8} />
            <line x1={padL} x2={W - padR} y1={yFor(stopPct)} y2={yFor(stopPct)} stroke="#d6a23e" strokeWidth={2} strokeDasharray="6 4" opacity={0.4} />
          </>
        )}
        {startPct !== undefined && (
          <>
            <line x1={padL} x2={W - padR} y1={yFor(startPct)} y2={yFor(startPct)} stroke="#48b07f" strokeWidth={2} opacity={0.8} />
            <line x1={padL} x2={W - padR} y1={yFor(startPct)} y2={yFor(startPct)} stroke="#48b07f" strokeWidth={2} strokeDasharray="6 4" opacity={0.4} />
          </>
        )}

        {points.length >= 2 ? (
          <>
            <path d={area} fill="url(#lvlFill)" className="animate-fade-in" />
            <path
              d={path}
              fill="none"
              stroke="#4b8ef0"
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              className="animate-draw-in"
            />
            <circle cx={lastX} cy={lastY} r={4} fill="#6ea4f5" />
            <circle cx={lastX} cy={lastY} r={7} fill="none" stroke="#6ea4f5" strokeOpacity={0.5} strokeWidth={1.5} className="animate-pulse-led" />
          </>
        ) : (
          <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-ink-faint" style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>
            recolectando datos…
          </text>
        )}

        {/* escala X */}
        {xLabels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
            className="fill-ink-faint"
            style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
          >
            {l.t}
          </text>
        ))}
      </svg>
    </div>
  );
}
