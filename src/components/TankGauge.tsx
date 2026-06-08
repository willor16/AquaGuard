"use client";

// Onda de la superficie del agua (se repite en X y se anima con animate-wave).
const WAVE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='24' viewBox='0 0 120 24'>
       <path d='M0 12 C 20 2, 40 2, 60 12 S 100 22, 120 12 L120 24 L0 24 Z' fill='#5ffaee' fill-opacity='0.55'/>
     </svg>`
  );

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
  height = 320,
}: Props) {
  const lvl = Math.max(0, Math.min(100, levelPct));
  const overflow = lvl >= 98;
  const low = lvl <= startPct;

  const waterTop = offline
    ? "#3a4759"
    : overflow
    ? "#ff4d5e"
    : "#2ee6d6";
  const waterBot = offline
    ? "#283142"
    : overflow
    ? "#b3303c"
    : "#0b7c72";

  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);

  return (
    <div className="flex items-stretch gap-3" style={{ height }}>
      {/* escala graduada */}
      <div className="relative w-9 shrink-0">
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute right-0 flex items-center gap-1"
            style={{ bottom: `calc(${t}% - 0.5px)`, transform: "translateY(50%)" }}
          >
            {t % 20 === 0 && (
              <span className="font-mono text-[9px] tabular-nums text-ink-faint">
                {t}
              </span>
            )}
            <span
              className="block h-px bg-base-600"
              style={{ width: t % 20 === 0 ? 8 : 5 }}
            />
          </div>
        ))}
      </div>

      {/* cuerpo del tanque */}
      <div className="relative flex-1">
        <div className="relative h-full w-full overflow-hidden rounded-[14px] border-2 border-base-600 bg-base-900/70 panel-grid scanlines">
          {/* agua */}
          <div
            className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
            style={{
              height: `${lvl}%`,
              background: `linear-gradient(to top, ${waterBot}, ${waterTop})`,
            }}
          >
            {/* superficie ondulada */}
            {!offline && (
              <>
                <div
                  className="absolute left-0 top-0 h-6 w-[200%] animate-wave -translate-y-1/2"
                  style={{ backgroundImage: `url("${WAVE}")`, backgroundSize: "120px 24px", backgroundRepeat: "repeat-x" }}
                />
                <div
                  className="absolute left-0 top-0 h-6 w-[200%] animate-wave-slow -translate-y-1/2 opacity-50"
                  style={{ backgroundImage: `url("${WAVE}")`, backgroundSize: "120px 24px", backgroundRepeat: "repeat-x" }}
                />
              </>
            )}
            {/* brillo interno */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-black/20" />
          </div>

          {/* marcador STOP / apagado */}
          <ThresholdLine pct={stopPct} label="OFF" tone="#ff8a3d" />
          {/* marcador START / encendido */}
          <ThresholdLine pct={startPct} label="ON" tone="#22c98a" />

          {/* lectura grande superpuesta */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
            <div
              className="readout text-5xl font-bold leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              style={{ color: offline ? "#8a97aa" : "#eafffb" }}
            >
              {lvl.toFixed(0)}
              <span className="text-2xl font-medium text-ink-dim">%</span>
            </div>
          </div>

          {offline && (
            <div className="absolute inset-x-0 bottom-3 text-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                señal perdida
              </span>
            </div>
          )}
        </div>

        {/* estado bajo el medidor */}
        <div className="mt-2 flex items-center justify-center gap-2">
          {low && !offline && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-good">
              ▸ nivel bajo · llenando
            </span>
          )}
          {overflow && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bad">
              ▲ sobrenivel
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ThresholdLine({
  pct,
  label,
  tone,
}: {
  pct: number;
  label: string;
  tone: string;
}) {
  return (
    <div
      className="absolute inset-x-0 flex items-center"
      style={{ bottom: `${pct}%` }}
    >
      <div
        className="h-px flex-1"
        style={{
          backgroundImage: `repeating-linear-gradient(to right, ${tone} 0 6px, transparent 6px 11px)`,
        }}
      />
      <span
        className="ml-1 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums"
        style={{ color: tone, background: `${tone}1f`, border: `1px solid ${tone}55` }}
      >
        {label} {pct}
      </span>
    </div>
  );
}
