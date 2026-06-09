"use client";

// Onda de la superficie del agua (se repite en X y se anima con animate-wave).
const WAVE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='24' viewBox='0 0 120 24'>
       <path d='M0 12 C 20 2, 40 2, 60 12 S 100 22, 120 12 L120 24 L0 24 Z' fill='#ffffff' fill-opacity='0.18'/>
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
  height = 300,
}: Props) {
  const lvl = Math.max(0, Math.min(100, levelPct));
  const overflow = lvl >= 98;
  const low = lvl <= startPct;

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
            className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
            style={{
              height: `${lvl}%`,
              background: `linear-gradient(to top, ${waterBot}, ${waterTop})`,
            }}
          >
            {!offline && (
              <>
                <div
                  className="absolute left-0 top-0 h-5 w-[200%] -translate-y-1/2 animate-wave"
                  style={{
                    backgroundImage: `url("${WAVE}")`,
                    backgroundSize: "120px 24px",
                    backgroundRepeat: "repeat-x",
                  }}
                />
                <div
                  className="absolute left-0 top-0 h-5 w-[200%] -translate-y-1/2 animate-wave-slow opacity-60"
                  style={{
                    backgroundImage: `url("${WAVE}")`,
                    backgroundSize: "120px 24px",
                    backgroundRepeat: "repeat-x",
                  }}
                />
              </>
            )}
          </div>

          {/* marcadores de umbral */}
          <ThresholdLine pct={stopPct} label={`off ${stopPct}`} tone="#d6a23e" />
          <ThresholdLine pct={startPct} label={`on ${startPct}`} tone="#48b07f" />

          {/* lectura grande superpuesta */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
            <div
              className="readout text-5xl font-semibold leading-none"
              style={{
                color: offline ? "#9aa6b4" : "#ffffff",
                textShadow: "0 1px 8px rgba(0,0,0,0.55)",
              }}
            >
              {lvl.toFixed(0)}
              <span className="text-2xl font-medium text-ink-dim">%</span>
            </div>
          </div>

          {offline && (
            <div className="absolute inset-x-0 bottom-3 text-center text-[11px] text-ink-faint">
              señal perdida
            </div>
          )}
        </div>

        {/* estado bajo el medidor */}
        <div className="mt-2 flex items-center justify-center gap-2 text-[12px]">
          {low && !offline && <span className="text-good">nivel bajo · llenando</span>}
          {overflow && <span className="text-bad">sobrenivel</span>}
        </div>
      </div>
    </div>
  );
}

function ThresholdLine({ pct, label, tone }: { pct: number; label: string; tone: string }) {
  return (
    <div className="absolute inset-x-0 flex items-center" style={{ bottom: `${pct}%` }}>
      <div
        className="h-px flex-1"
        style={{
          backgroundImage: `repeating-linear-gradient(to right, ${tone} 0 6px, transparent 6px 11px)`,
        }}
      />
      <span
        className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
        style={{ color: tone, background: `${tone}1f`, border: `1px solid ${tone}44` }}
      >
        {label}
      </span>
    </div>
  );
}
