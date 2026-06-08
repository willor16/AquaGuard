"use client";

import { useState } from "react";

/** Botón de paro de emergencia. Parar es inmediato (1 toque); reanudar exige confirmación. */
export function EmergencyStop({
  active,
  canControl,
  onStop,
  onResume,
}: {
  active: boolean;
  canControl: boolean;
  onStop: () => void;
  onResume: () => void;
}) {
  const [confirm, setConfirm] = useState(false);

  if (active) {
    return (
      <div className="flex items-center gap-2">
        {confirm ? (
          <>
            <button
              onClick={() => {
                onResume();
                setConfirm(false);
              }}
              className="rounded-lg border border-good/60 bg-good/15 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-good transition hover:bg-good/25"
            >
              confirmar reanudación
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint hover:text-ink"
            >
              cancelar
            </button>
          </>
        ) : (
          <button
            disabled={!canControl}
            onClick={() => setConfirm(true)}
            className="rounded-lg border border-good/50 bg-good/10 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-good transition hover:bg-good/20 disabled:opacity-40"
          >
            ⟲ reanudar operación
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      disabled={!canControl}
      onClick={onStop}
      className="group inline-flex items-center gap-2.5 rounded-lg border-2 border-bad/60 bg-bad/10 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-bad shadow-glow-bad transition hover:border-bad hover:bg-bad/20 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-bad text-[10px] transition group-hover:animate-pulse-led">
        ✕
      </span>
      paro de emergencia
    </button>
  );
}
