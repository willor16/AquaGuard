"use client";

import { useEffect, useRef, useState } from "react";
import { Led } from "./ui";
import { COMMAND_TIMEOUT_MS, type ActuatorKind, type Mode } from "@/lib/types";

interface Props {
  kind: ActuatorKind;
  reportedOn: boolean;
  mode: Mode;
  online: boolean;
  canControl: boolean;
  relayChannel?: number | null;
  onCommand: (value: boolean) => void;
}

const META: Record<ActuatorKind, { name: string; icon: string }> = {
  pump: { name: "Bomba", icon: "◉" },
  valve: { name: "Válvula", icon: "⬡" },
};

export function ActuatorControl({
  kind,
  reportedOn,
  mode,
  online,
  canControl,
  relayChannel,
  onCommand,
}: Props) {
  const meta = META[kind];
  const [pending, setPending] = useState<boolean | null>(null); // target esperado
  const [timedOut, setTimedOut] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // cuando reported confirma el target, se limpia el "enviando…"
  useEffect(() => {
    if (pending !== null && reportedOn === pending) {
      setPending(null);
      setTimedOut(false);
      if (timer.current) clearTimeout(timer.current);
    }
  }, [reportedOn, pending]);

  const send = (value: boolean) => {
    if (!canControl || mode !== "manual" || !online) return;
    setPending(value);
    setTimedOut(false);
    onCommand(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPending((p) => {
        if (p !== null) setTimedOut(true);
        return null;
      });
    }, COMMAND_TIMEOUT_MS);
  };

  const manual = mode === "manual";
  const sending = pending !== null;

  const stateTone = reportedOn ? "good" : "idle";
  const stateText = sending
    ? "enviando…"
    : reportedOn
    ? "encendido"
    : "apagado";

  return (
    <div className="rounded-lg border border-base-700/80 bg-base-850/60 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-md border text-lg"
            style={{
              borderColor: reportedOn ? "#22c98a55" : "#283142",
              color: reportedOn ? "#22c98a" : "#5b6678",
              background: reportedOn ? "#22c98a14" : "transparent",
            }}
          >
            {meta.icon}
          </span>
          <div>
            <div className="font-semibold text-ink">{meta.name}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              {relayChannel ? `relé CH${relayChannel}` : "sin canal"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Led tone={sending ? "warn" : (stateTone as "good" | "idle")} pulse={sending || reportedOn} />
          <span
            className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
              sending ? "text-warn" : reportedOn ? "text-good" : "text-ink-faint"
            }`}
          >
            {stateText}
          </span>
        </div>
      </div>

      {manual ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => send(true)}
            disabled={!canControl || !online || (reportedOn && !sending)}
            className={`rounded-md border px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] transition disabled:opacity-40 ${
              reportedOn
                ? "border-good/60 bg-good/15 text-good"
                : "border-base-600 text-ink-dim hover:border-good/50 hover:text-good"
            }`}
          >
            Encender
          </button>
          <button
            onClick={() => send(false)}
            disabled={!canControl || !online || (!reportedOn && !sending)}
            className={`rounded-md border px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] transition disabled:opacity-40 ${
              !reportedOn
                ? "border-base-600 bg-base-700/40 text-ink"
                : "border-base-600 text-ink-dim hover:border-bad/50 hover:text-bad"
            }`}
          >
            Apagar
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-base-700 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          controlado por modo automático
        </div>
      )}

      {timedOut && (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-warn">
          <span>⚠</span> sin confirmación · pudo activarse una protección
        </div>
      )}
    </div>
  );
}

export function ModeSwitch({
  mode,
  reportedMode,
  online,
  canControl,
  onChange,
}: {
  mode: Mode;
  reportedMode: Mode;
  online: boolean;
  canControl: boolean;
  onChange: (m: Mode) => void;
}) {
  const pending = mode !== reportedMode;
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid grid-cols-2 rounded-lg border border-base-600 bg-base-850 p-1">
        <span
          className="absolute inset-y-1 w-[calc(50%-4px)] rounded-md bg-cyan/15 ring-1 ring-cyan/50 transition-transform duration-300"
          style={{ transform: reportedMode === "manual" ? "translateX(100%)" : "translateX(0)" }}
        />
        {(["auto", "manual"] as Mode[]).map((m) => (
          <button
            key={m}
            disabled={!canControl || !online}
            onClick={() => onChange(m)}
            className={`relative z-10 rounded-md px-5 py-2 font-mono text-xs uppercase tracking-[0.16em] transition disabled:opacity-40 ${
              reportedMode === m ? "text-cyan" : "text-ink-dim hover:text-ink"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      {pending && (
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn">
          aplicando…
        </span>
      )}
    </div>
  );
}
