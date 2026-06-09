"use client";

import { useEffect, useState } from "react";

/**
 * Paro general de la flota. Al ser una acción de alto impacto (afecta todos los tanques),
 * tanto parar como reanudar piden una confirmación rápida de 2 pasos.
 */
export function FleetEStop({
  stopped,
  total,
  canControl,
  onStopAll,
  onResumeAll,
}: {
  stopped: number;
  total: number;
  canControl: boolean;
  onStopAll: () => void;
  onResumeAll: () => void;
}) {
  const [confirm, setConfirm] = useState<null | "stop" | "resume">(null);
  const allStopped = stopped > 0 && stopped === total;

  // si cambia el estado de la flota, cancelar cualquier confirmación pendiente
  useEffect(() => {
    setConfirm(null);
  }, [stopped, total]);

  if (!canControl || total === 0) return null;

  if (confirm === "stop") {
    return (
      <Confirm
        tone="bad"
        label={`parar ${total} tanque${total > 1 ? "s" : ""}`}
        onConfirm={onStopAll}
        onCancel={() => setConfirm(null)}
      />
    );
  }
  if (confirm === "resume") {
    return (
      <Confirm
        tone="good"
        label={`reanudar ${stopped} tanque${stopped > 1 ? "s" : ""}`}
        onConfirm={onResumeAll}
        onCancel={() => setConfirm(null)}
      />
    );
  }

  return (
    <div className="flex items-center gap-2">
      {stopped > 0 && (
        <button
          onClick={() => setConfirm("resume")}
          className="rounded-md border border-good/50 bg-good/10 px-3 py-1.5 text-[12px] font-medium text-good transition hover:bg-good/15"
        >
          reanudar flota
        </button>
      )}
      {!allStopped && (
        <button
          onClick={() => setConfirm("stop")}
          className="inline-flex items-center gap-2 rounded-md border border-bad/50 bg-bad/10 px-3 py-1.5 text-[12px] font-semibold text-bad transition hover:bg-bad/15"
        >
          <span className="grid h-4 w-4 place-items-center rounded-full border border-bad text-[9px]">
            ✕
          </span>
          paro general
          {stopped > 0 && <span className="font-normal text-ink-faint">· {stopped}</span>}
        </button>
      )}
    </div>
  );
}

function Confirm({
  tone,
  label,
  onConfirm,
  onCancel,
}: {
  tone: "bad" | "good";
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cls =
    tone === "bad"
      ? "border-bad/60 bg-bad/15 text-bad hover:bg-bad/20"
      : "border-good/60 bg-good/15 text-good hover:bg-good/20";
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onConfirm}
        className={`rounded-md border px-3 py-1.5 text-[12px] font-semibold transition ${cls}`}
      >
        confirmar · {label}
      </button>
      <button
        onClick={onCancel}
        className="text-[12px] text-ink-faint transition hover:text-ink"
      >
        cancelar
      </button>
    </div>
  );
}
