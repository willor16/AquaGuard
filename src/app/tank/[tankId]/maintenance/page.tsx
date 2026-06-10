"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Instrument, Button, Led, Spinner } from "@/components/ui";
import { Calendar } from "@/components/Calendar";
import { useTank, useTicker } from "@/lib/hooks";
import { getData } from "@/lib/data";
import { useAuth, canConfigure } from "@/lib/auth";
import {
  activeMaintenance,
  maintenanceList,
  nextMaintenance,
  fmtRange,
  fmtDuration,
} from "@/lib/maintenance";
import type { MaintenanceWindow } from "@/lib/types";

function toLocalInput(epochS: number): string {
  const d = new Date(epochS * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fromLocalInput(s: string): number {
  return Math.floor(new Date(s).getTime() / 1000);
}
function genId(): string {
  return `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

interface FormState {
  id: string | null;
  title: string;
  start: string;
  end: string;
  note: string;
  disableAuto: boolean;
}

function emptyForm(dayS?: number): FormState {
  const base = dayS ?? Math.floor(Date.now() / 1000);
  const start = dayS ? dayS + 8 * 3600 : Math.ceil(base / 1800) * 1800;
  return {
    id: null,
    title: "",
    start: toLocalInput(start),
    end: toLocalInput(start + 2 * 3600),
    note: "",
    disableAuto: true,
  };
}

function Maintenance({ tankId }: { tankId: string }) {
  const { tank, loading } = useTank(tankId);
  const { user } = useAuth();
  useTicker(1000);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const editable = canConfigure(user?.role);
  const list = useMemo(() => maintenanceList(tank?.config), [tank?.config]);
  const active = activeMaintenance(tank?.config);
  const next = nextMaintenance(tank?.config);

  useEffect(() => {
    if (tank && form.start === "") setForm(emptyForm());
  }, [tank, form.start]);

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner label="Cargando mantenimientos…" />
      </div>
    );
  }

  const startS = fromLocalInput(form.start);
  const endS = fromLocalInput(form.end);
  const invalid = !form.title.trim() || !(endS > startS);

  const save = async () => {
    if (invalid) return;
    const w: MaintenanceWindow = {
      id: form.id ?? genId(),
      title: form.title.trim(),
      startTs: startS,
      endTs: endS,
      note: form.note.trim() || undefined,
      disableAuto: form.disableAuto,
      createdBy: user?.email ?? undefined,
    };
    await getData().upsertMaintenance(tankId, w);
    setForm(emptyForm());
    setSelectedDay(null);
  };

  const edit = (w: MaintenanceWindow) => {
    setForm({
      id: w.id,
      title: w.title,
      start: toLocalInput(w.startTs),
      end: toLocalInput(w.endTs),
      note: w.note ?? "",
      disableAuto: w.disableAuto,
    });
    setSelectedDay(null);
  };

  const remove = async (id: string) => {
    await getData().deleteMaintenance(tankId, id);
    if (form.id === id) setForm(emptyForm());
  };

  const nowS = Math.floor(Date.now() / 1000);

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-ink-dim">
        programa ventanas · el llenado automático se suspende mientras están activas
      </p>

      {/* estado */}
      {active ? (
        <div className="flex items-center gap-3 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-[13px]">
          <Led tone="warn" pulse />
          <span className="text-amber">
            <span className="font-semibold">Mantenimiento en curso</span> · {active.title}{" "}
            <span className="text-ink-dim">
              — {active.disableAuto ? "llenado automático en pausa" : "sin suspender auto"} ·{" "}
              {fmtRange(active)}
            </span>
          </span>
        </div>
      ) : next ? (
        <div className="flex items-center gap-3 rounded-lg border border-base-700 bg-base-800 px-4 py-3 text-[13px]">
          <Led tone="info" />
          <span className="text-ink-dim">
            Próximo · <span className="text-ink">{next.title}</span> — {fmtRange(next)}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-base-700 bg-base-800 px-4 py-3 text-[13px]">
          <Led tone="good" />
          <span className="text-ink-dim">sin mantenimientos programados</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,380px)]">
        {/* calendario */}
        <Instrument label="Calendario de mantenimiento">
          <Calendar
            windows={list}
            selectedDayS={selectedDay}
            onPickDay={(dayS) => {
              if (!editable) return;
              setSelectedDay(dayS);
              setForm(emptyForm(dayS));
            }}
          />
        </Instrument>

        {/* programar + lista */}
        <div className="space-y-5">
          {editable && (
            <Instrument label={form.id ? "Editar mantenimiento" : "Programar mantenimiento"}>
              <div className="space-y-3.5">
                <Field label="actividad">
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Limpieza de tanque / cambio de sensor"
                    className="inp"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="inicio">
                    <input
                      type="datetime-local"
                      value={form.start}
                      onChange={(e) => setForm({ ...form, start: e.target.value })}
                      className="inp"
                    />
                  </Field>
                  <Field label="fin">
                    <input
                      type="datetime-local"
                      value={form.end}
                      onChange={(e) => setForm({ ...form, end: e.target.value })}
                      className={`inp ${endS <= startS ? "border-bad/60" : ""}`}
                    />
                  </Field>
                </div>
                <Field label="nota (opcional)">
                  <input
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="responsable, detalles…"
                    className="inp"
                  />
                </Field>

                <button
                  onClick={() => setForm({ ...form, disableAuto: !form.disableAuto })}
                  className={`flex w-full items-center justify-between rounded-md border px-3.5 py-2.5 text-left transition ${
                    form.disableAuto ? "border-amber/50 bg-amber/[0.06]" : "border-base-700"
                  }`}
                >
                  <span>
                    <span className="block text-[13px] text-ink">suspender llenado automático</span>
                    <span className="block text-[11px] text-ink-faint">
                      durante la ventana el tanque no se llenará solo
                    </span>
                  </span>
                  <span
                    className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                      form.disableAuto ? "border-amber/60 bg-amber/25" : "border-base-600 bg-base-800"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
                        form.disableAuto ? "translate-x-[22px] bg-amber" : "translate-x-0.5 bg-ink-faint"
                      }`}
                    />
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <Button variant="primary" className="flex-1" onClick={save} disabled={invalid}>
                    {form.id ? "guardar cambios" : "programar"}
                  </Button>
                  {form.id && (
                    <Button variant="ghost" onClick={() => setForm(emptyForm())}>
                      cancelar
                    </Button>
                  )}
                </div>
              </div>
            </Instrument>
          )}

          {/* lista */}
          <Instrument label={`Actividades programadas · ${list.length}`}>
            {list.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-ink-faint">sin actividades</p>
            ) : (
              <ul className="space-y-2">
                {list.map((w) => {
                  const isActive = nowS >= w.startTs && nowS < w.endTs;
                  const isPast = nowS >= w.endTs;
                  const tone = isActive ? "warn" : isPast ? "idle" : "info";
                  const stateLabel = isActive ? "en curso" : isPast ? "finalizada" : "próxima";
                  return (
                    <li
                      key={w.id}
                      className={`rounded-md border px-3.5 py-3 ${
                        isActive ? "border-amber/40 bg-amber/[0.06]" : "border-base-700"
                      } ${isPast ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Led tone={tone as "warn" | "idle" | "info"} pulse={isActive} size={7} />
                            <span className="truncate font-medium text-ink">{w.title}</span>
                          </div>
                          <div className="mt-1 text-[12px] text-ink-dim">
                            {fmtRange(w)} · {fmtDuration(w)}
                          </div>
                          {w.note && (
                            <div className="mt-0.5 text-[11px] text-ink-faint">{w.note}</div>
                          )}
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[11px] text-ink-faint">{stateLabel}</span>
                            {w.disableAuto && (
                              <span className="rounded bg-amber/15 px-1.5 py-0.5 text-[10px] text-amber">
                                auto en pausa
                              </span>
                            )}
                          </div>
                        </div>
                        {editable && (
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <button
                              onClick={() => edit(w)}
                              className="text-[12px] text-ink-dim transition hover:text-cyan"
                            >
                              editar
                            </button>
                            <button
                              onClick={() => remove(w.id)}
                              className="text-[12px] text-ink-faint transition hover:text-bad"
                            >
                              eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Instrument>
        </div>
      </div>
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

export default function MaintenancePage() {
  const params = useParams<{ tankId: string }>();
  return <Maintenance tankId={params.tankId} />;
}
