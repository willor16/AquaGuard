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

const META: Record<ActuatorKind, { name: string }> = {
  pump: { name: "Bomba" },
  valve: { name: "Válvula" },
};

function ActuatorIcon({ kind, active }: { kind: ActuatorKind; active: boolean }) {
  const c = active ? "#48b07f" : "#69737f";
  if (kind === "pump") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.6" />
        <path d="M12 8v8M8 12h8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 5 7v10l7 4 7-4V7l-7-4Z"
        stroke={c}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

  const stateText = sending ? "enviando…" : reportedOn ? "encendido" : "apagado";

  return (
    <div className="rounded-md border border-base-700 bg-base-850 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-md border"
            style={{
              borderColor: reportedOn ? "#48b07f55" : "#252c37",
              background: reportedOn ? "#48b07f14" : "transparent",
            }}
          >
            <ActuatorIcon kind={kind} active={reportedOn} />
          </span>
          <div>
            <div className="font-medium text-ink">{meta.name}</div>
            <div className="text-[11px] text-ink-faint">
              {relayChannel ? `relé CH${relayChannel}` : "sin canal"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Led tone={sending ? "warn" : reportedOn ? "good" : "idle"} pulse={sending || reportedOn} />
          <span
            className={`text-[12px] ${
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
            className={`rounded-md border px-3 py-2 text-[13px] font-medium transition disabled:opacity-40 ${
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
            className={`rounded-md border px-3 py-2 text-[13px] font-medium transition disabled:opacity-40 ${
              !reportedOn
                ? "border-base-600 bg-base-700 text-ink"
                : "border-base-600 text-ink-dim hover:border-bad/50 hover:text-bad"
            }`}
          >
            Apagar
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-base-700 px-3 py-2 text-center text-[12px] text-ink-faint">
          controlado por modo automático
        </div>
      )}

      {timedOut && (
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-warn">
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
    <div className="flex items-center gap-2.5">
      <div className="relative grid grid-cols-2 rounded-md border border-base-600 bg-base-850 p-0.5">
        <span
          className="absolute inset-y-0.5 w-[calc(50%-2px)] rounded bg-cyan/15 ring-1 ring-cyan/40 transition-transform duration-300"
          style={{ transform: reportedMode === "manual" ? "translateX(100%)" : "translateX(0)" }}
        />
        {(["auto", "manual"] as Mode[]).map((m) => (
          <button
            key={m}
            disabled={!canControl || !online}
            onClick={() => onChange(m)}
            className={`relative z-10 rounded px-4 py-1.5 text-[13px] font-medium transition disabled:opacity-40 ${
              reportedMode === m ? "text-cyan" : "text-ink-dim hover:text-ink"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      {pending && <span className="text-[11px] text-warn">aplicando…</span>}
    </div>
  );
}
