"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { Shell } from "@/components/Shell";
import { Instrument, Button, Led, Spinner } from "@/components/ui";
import { useTanksList } from "@/lib/hooks";
import { getData } from "@/lib/data";
import { useAuth, canManageTanks } from "@/lib/auth";
import type { TankConfig } from "@/lib/types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
}

const NEW: () => {
  name: string;
  location: string;
  tankId: string;
  startPct: number;
  stopPct: number;
  pump: boolean;
  pumpCh: number | null;
  valve: boolean;
  valveCh: number | null;
} = () => ({
  name: "",
  location: "",
  tankId: "",
  startPct: 30,
  stopPct: 90,
  pump: true,
  pumpCh: 1,
  valve: false,
  valveCh: null,
});

function Manage() {
  const { user } = useAuth();
  const { tanks, loading } = useTanksList();
  const [f, setF] = useState(NEW());
  const [idTouched, setIdTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!canManageTanks(user?.role)) {
    return (
      <div className="panel grid place-items-center gap-2 py-16 text-center">
        <span className="text-2xl">🔒</span>
        <p className="text-sm text-ink-dim">Solo un administrador puede gestionar tanques.</p>
      </div>
    );
  }

  const effId = idTouched ? f.tankId : slugify(f.name);
  const startErr = !(f.startPct > 0 && f.startPct < f.stopPct);
  const stopErr = !(f.stopPct > f.startPct && f.stopPct <= 100);
  const noneEnabled = !f.pump && !f.valve;
  const clash = f.pump && f.valve && f.pumpCh != null && f.pumpCh === f.valveCh;
  const idErr = !effId || tanks.some((t) => t.tankId === effId);
  const invalid = startErr || stopErr || noneEnabled || clash || idErr || !f.name;

  const create = async () => {
    setError(null);
    if (invalid) return;
    const config: TankConfig = {
      mode: "auto",
      startPct: f.startPct,
      stopPct: f.stopPct,
      actuators: {
        pump: { enabled: f.pump, relayChannel: f.pump ? f.pumpCh : null },
        valve: { enabled: f.valve, relayChannel: f.valve ? f.valveCh : null },
      },
      actuationStrategy: f.pump && f.valve ? "priority" : "single",
    };
    try {
      await getData().createTank({
        tankId: effId,
        meta: { name: f.name, location: f.location },
        config,
      });
      setF(NEW());
      setIdTouched(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el tanque");
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,400px)]">
      {/* listado */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">
          Tanques registrados <span className="text-ink-faint">· {tanks.length}</span>
        </h2>

        {loading ? (
          <Spinner />
        ) : tanks.length === 0 ? (
          <div className="panel py-10 text-center text-[13px] text-ink-faint">
            aún no hay tanques · crea el primero →
          </div>
        ) : (
          <ul className="space-y-2.5">
            {tanks.map((t) => (
              <li key={t.tankId} className="panel flex items-center gap-3 p-3.5">
                <Led tone="cyan" size={8} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-ink">{t.meta.name}</span>
                    <span className="rounded bg-base-750 px-1.5 py-0.5 font-mono text-[11px] text-ink-faint">
                      {t.tankId}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-ink-dim">
                    {t.config?.actuators?.pump?.enabled && (
                      <span>bomba · CH{t.config.actuators.pump.relayChannel ?? "—"}</span>
                    )}
                    {t.config?.actuators?.valve?.enabled && (
                      <span>válvula · CH{t.config.actuators.valve.relayChannel ?? "—"}</span>
                    )}
                    <span className="text-ink-faint">
                      on {t.config?.startPct}% / off {t.config?.stopPct}%
                    </span>
                  </div>
                </div>
                <Link
                  href={`/tank/${t.tankId}/config`}
                  className="rounded-md border border-base-600 px-2.5 py-1.5 text-[12px] text-ink-dim transition hover:border-cyan/50 hover:text-cyan"
                >
                  editar
                </Link>
                {confirmDelete === t.tankId ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={async () => {
                        await getData().deleteTank(t.tankId);
                        setConfirmDelete(null);
                      }}
                      className="rounded-md border border-bad/60 bg-bad/15 px-2.5 py-1.5 text-[12px] font-medium text-bad"
                    >
                      confirmar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-[12px] text-ink-faint"
                    >
                      no
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(t.tankId)}
                    className="rounded-md border border-base-600 px-2.5 py-1.5 text-[12px] text-ink-dim transition hover:border-bad/50 hover:text-bad"
                  >
                    eliminar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* alta */}
      <Instrument label="Dar de alta un tanque">
        <div className="space-y-4">
          <Field label="nombre del tanque">
            <input
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Tanque Cantón Sur"
              className="input"
            />
          </Field>

          <Field label="ubicación (opcional)">
            <input
              value={f.location}
              onChange={(e) => setF({ ...f, location: e.target.value })}
              placeholder="Sector Sur · azotea"
              className="input"
            />
          </Field>

          <Field label="id del tanque (lo reconoce el ESP32)">
            <input
              value={effId}
              onChange={(e) => {
                setIdTouched(true);
                setF({ ...f, tankId: slugify(e.target.value) });
              }}
              placeholder="canton-sur"
              className={`input font-mono ${idErr ? "border-bad/60" : ""}`}
            />
            {idErr && effId !== "" && (
              <span className="mt-1 block text-[11px] text-bad">id ya en uso</span>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="encender ON %">
              <input
                type="number"
                min={1}
                max={99}
                value={f.startPct}
                onChange={(e) => setF({ ...f, startPct: Number(e.target.value) })}
                className={`input ${startErr ? "border-bad/60" : ""}`}
              />
            </Field>
            <Field label="apagar OFF %">
              <input
                type="number"
                min={1}
                max={100}
                value={f.stopPct}
                onChange={(e) => setF({ ...f, stopPct: Number(e.target.value) })}
                className={`input ${stopErr ? "border-bad/60" : ""}`}
              />
            </Field>
          </div>

          {/* actuadores */}
          <div className="space-y-2.5">
            <span className="label">actuadores conectados</span>
            <ChannelRow
              name="Bomba"
              enabled={f.pump}
              channel={f.pumpCh}
              onToggle={(v) => setF({ ...f, pump: v, pumpCh: v ? f.pumpCh ?? 1 : null })}
              onChannel={(v) => setF({ ...f, pumpCh: v })}
            />
            <ChannelRow
              name="Válvula"
              enabled={f.valve}
              channel={f.valveCh}
              onToggle={(v) => setF({ ...f, valve: v, valveCh: v ? f.valveCh ?? 2 : null })}
              onChannel={(v) => setF({ ...f, valveCh: v })}
            />
            {clash && <p className="text-[11px] text-bad">⚠ canales de relé duplicados</p>}
            {noneEnabled && <p className="text-[11px] text-bad">⚠ habilita al menos un actuador</p>}
          </div>

          {error && (
            <div className="rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-[12px] text-bad">
              {error}
            </div>
          )}

          <Button variant="primary" className="w-full" onClick={create} disabled={invalid}>
            crear tanque
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-ink-faint">
            la app escribe meta/ y config/. el dispositivo poblará reported/ al conectarse.
          </p>
        </div>
      </Instrument>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function ChannelRow({
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
      className={`flex items-center justify-between rounded-md border px-3 py-2.5 transition ${
        enabled ? "border-cyan/40 bg-cyan/[0.05]" : "border-base-700"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Toggle checked={enabled} onChange={() => onToggle(!enabled)} />
        <span className={enabled ? "text-ink" : "text-ink-faint"}>{name}</span>
      </div>
      <div className={`flex items-center gap-1.5 ${enabled ? "" : "opacity-40"}`}>
        <span className="text-[12px] text-ink-faint">CH</span>
        <input
          type="number"
          min={1}
          max={16}
          disabled={!enabled}
          value={channel ?? ""}
          onChange={(e) => onChannel(e.target.value === "" ? null : Number(e.target.value))}
          className="w-14 rounded-md border border-base-600 bg-base-900/70 px-2 py-1 text-center font-mono text-sm text-ink outline-none focus:border-cyan/70"
        />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-5 w-9 rounded-full border transition ${
        checked ? "border-cyan/60 bg-cyan/25" : "border-base-600 bg-base-800"
      }`}
    >
      <span
        className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-transform ${
          checked ? "translate-x-[18px] bg-cyan" : "translate-x-0.5 bg-ink-faint"
        }`}
      />
    </button>
  );
}

export default function TanksSettingsPage() {
  return (
    <AuthGate>
      <Shell back={{ href: "/", label: "flota" }} title="gestión de tanques">
        <Manage />
      </Shell>
    </AuthGate>
  );
}
