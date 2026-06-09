"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { Shell } from "@/components/Shell";
import { Instrument, Button, Led, Spinner } from "@/components/ui";
import { useTank } from "@/lib/hooks";
import { getData } from "@/lib/data";
import { useAuth, canConfigure } from "@/lib/auth";
import type { ActuationStrategy, TankConfig } from "@/lib/types";

function ConfigForm({ tankId }: { tankId: string }) {
  const { tank, loading } = useTank(tankId);
  const { user } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<TankConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tank && !form) setForm(structuredClone(tank.config));
  }, [tank, form]);

  if (loading || !form) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner label="Cargando configuración…" />
      </div>
    );
  }

  if (!canConfigure(user?.role)) {
    return (
      <div className="panel grid place-items-center gap-2 py-16 text-center">
        <span className="text-2xl">🔒</span>
        <p className="text-sm text-ink-dim">
          Tu rol ({user?.role}) no puede editar la configuración.
        </p>
      </div>
    );
  }

  const startErr = !(form.startPct > 0 && form.startPct < form.stopPct);
  const stopErr = !(form.stopPct > form.startPct && form.stopPct <= 100);
  const pump = form.actuators.pump;
  const valve = form.actuators.valve;
  const bothEnabled = pump.enabled && valve.enabled;
  const noneEnabled = !pump.enabled && !valve.enabled;
  const channelClash =
    pump.enabled &&
    valve.enabled &&
    pump.relayChannel != null &&
    pump.relayChannel === valve.relayChannel;

  const invalid = startErr || stopErr || noneEnabled || channelClash;

  const set = (patch: Partial<TankConfig>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
    setSaved(false);
  };

  const save = async () => {
    if (invalid || !form) return;
    // si no hay dos actuadores, forzar estrategia single
    const strategy: ActuationStrategy = bothEnabled ? form.actuationStrategy : "single";
    await getData().writeConfig(tankId, { ...form, actuationStrategy: strategy });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-ink">Configuración · {tank?.meta.name}</h1>
        <p className="text-[13px] text-ink-dim">
          escribe en config/ · el dispositivo la lee como caja negra
        </p>
      </div>

      {/* umbrales */}
      <Instrument label="Umbrales de control automático">
        <p className="mb-4 text-[13px] text-ink-dim">
          el dispositivo enciende al bajar de <span className="text-good">ON</span> y apaga al
          alcanzar <span className="text-amber">OFF</span>. regla: 0 &lt; ON &lt; OFF ≤ 100.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <SliderField
            label="encender (ON)"
            tone="#48b07f"
            value={form.startPct}
            error={startErr}
            onChange={(v) => set({ startPct: v })}
          />
          <SliderField
            label="apagar (OFF)"
            tone="#d6a23e"
            value={form.stopPct}
            error={stopErr}
            onChange={(v) => set({ stopPct: v })}
          />
        </div>
        {/* barra ilustrativa */}
        <div className="relative mt-5 h-3 rounded-full border border-base-700 bg-base-900">
          <span
            className="absolute inset-y-0 rounded-full bg-cyan/20"
            style={{ left: `${form.startPct}%`, width: `${Math.max(0, form.stopPct - form.startPct)}%` }}
          />
          <span
            className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-good"
            style={{ left: `${form.startPct}%` }}
          />
          <span
            className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-amber"
            style={{ left: `${form.stopPct}%` }}
          />
        </div>
      </Instrument>

      {/* actuadores */}
      <Instrument label="Actuadores y mapeo de relés">
        <p className="mb-4 text-[13px] text-ink-dim">
          habilita los actuadores conectados y asigna su canal en el módulo de relés (ej. tira de 8
          canales). así el ESP32 sabe qué relé accionar.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ActuatorEditor
            name="Bomba"
            enabled={pump.enabled}
            channel={pump.relayChannel ?? null}
            onToggle={(enabled) => set({ actuators: { ...form.actuators, pump: { ...pump, enabled } } })}
            onChannel={(relayChannel) =>
              set({ actuators: { ...form.actuators, pump: { ...pump, relayChannel } } })
            }
          />
          <ActuatorEditor
            name="Válvula"
            enabled={valve.enabled}
            channel={valve.relayChannel ?? null}
            onToggle={(enabled) => set({ actuators: { ...form.actuators, valve: { ...valve, enabled } } })}
            onChannel={(relayChannel) =>
              set({ actuators: { ...form.actuators, valve: { ...valve, relayChannel } } })
            }
          />
        </div>

        {channelClash && (
          <p className="mt-3 text-[12px] text-bad">
            ⚠ bomba y válvula no pueden compartir el mismo canal de relé.
          </p>
        )}
        {noneEnabled && <p className="mt-3 text-[12px] text-bad">⚠ habilita al menos un actuador.</p>}

        {/* estrategia (solo con dos) */}
        {bothEnabled && (
          <div className="mt-5">
            <div className="label mb-2">estrategia con dos actuadores</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["single", "Uno", "solo un actuador a la vez"],
                  ["both", "Ambos", "bomba y válvula juntas"],
                  ["priority", "Prioridad", "bomba primero, válvula de respaldo"],
                ] as [ActuationStrategy, string, string][]
              ).map(([val, title, desc]) => (
                <button
                  key={val}
                  onClick={() => set({ actuationStrategy: val })}
                  className={`rounded-md border px-3 py-2.5 text-left transition ${
                    form.actuationStrategy === val
                      ? "border-cyan/60 bg-cyan/10"
                      : "border-base-700 hover:border-base-600"
                  }`}
                >
                  <div
                    className={`text-[13px] font-medium ${
                      form.actuationStrategy === val ? "text-cyan" : "text-ink-dim"
                    }`}
                  >
                    {title}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-faint">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Instrument>

      {/* acciones */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push(`/tank/${tankId}`)}>
          ← cancelar
        </Button>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-[12px] text-good">
              <Led tone="good" /> guardado
            </span>
          )}
          <Button variant="primary" onClick={save} disabled={invalid}>
            guardar configuración
          </Button>
        </div>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  tone,
  error,
  onChange,
}: {
  label: string;
  value: number;
  tone: string;
  error?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="readout text-lg font-semibold" style={{ color: error ? "#dd5a68" : tone }}>
          {value}
          <span className="text-xs text-ink-faint">%</span>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: tone }}
      />
      {error && (
        <p className="mt-1 text-[11px] text-bad">valor fuera de rango (0 &lt; ON &lt; OFF ≤ 100)</p>
      )}
    </div>
  );
}

function ActuatorEditor({
  name,
  enabled,
  channel,
  onToggle,
  onChannel,
}: {
  name: string;
  enabled: boolean;
  channel: number | null;
  onToggle: (v: boolean) => void;
  onChannel: (v: number | null) => void;
}) {
  return (
    <div
      className={`rounded-md border p-3.5 transition ${
        enabled ? "border-cyan/40 bg-cyan/[0.05]" : "border-base-700 bg-base-850"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-medium ${enabled ? "text-ink" : "text-ink-faint"}`}>{name}</span>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`relative h-6 w-11 rounded-full border transition ${
            enabled ? "border-cyan/60 bg-cyan/25" : "border-base-600 bg-base-800"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
              enabled ? "translate-x-[22px] bg-cyan" : "translate-x-0.5 bg-ink-faint"
            }`}
          />
        </button>
      </div>
      <div className={`mt-3 flex items-center justify-between ${enabled ? "" : "opacity-40"}`}>
        <span className="label">canal de relé</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-ink-faint">CH</span>
          <input
            type="number"
            min={1}
            max={16}
            disabled={!enabled}
            value={channel ?? ""}
            onChange={(e) => onChannel(e.target.value === "" ? null : Number(e.target.value))}
            placeholder="—"
            className="w-16 rounded-md border border-base-600 bg-base-900/70 px-2 py-1 text-center font-mono text-sm text-ink outline-none focus:border-cyan/70"
          />
        </div>
      </div>
    </div>
  );
}

export default function ConfigPage() {
  const params = useParams<{ tankId: string }>();
  return (
    <AuthGate>
      <Shell back={{ href: `/tank/${params.tankId}`, label: "tanque" }} title="configuración">
        <ConfigForm tankId={params.tankId} />
      </Shell>
    </AuthGate>
  );
}
