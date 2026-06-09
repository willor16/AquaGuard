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
              className="rounded-md border border-good/60 bg-good/15 px-3.5 py-2 text-[13px] font-semibold text-good transition hover:bg-good/20"
            >
              confirmar reanudación
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="text-[12px] text-ink-faint transition hover:text-ink"
            >
              cancelar
            </button>
          </>
        ) : (
          <button
            disabled={!canControl}
            onClick={() => setConfirm(true)}
            className="rounded-md border border-good/50 bg-good/10 px-3.5 py-2 text-[13px] font-medium text-good transition hover:bg-good/15 disabled:opacity-40"
          >
            reanudar operación
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      disabled={!canControl}
      onClick={onStop}
      className="inline-flex items-center gap-2 rounded-md border border-bad/50 bg-bad/10 px-3.5 py-2 text-[13px] font-semibold text-bad transition hover:bg-bad/15 active:scale-[0.98] disabled:opacity-40"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full border border-bad text-[10px]">
        ✕
      </span>
      paro de emergencia
    </button>
  );
}
