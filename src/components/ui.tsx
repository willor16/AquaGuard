import { type ReactNode } from "react";

type Tone = "good" | "warn" | "bad" | "info" | "idle" | "cyan";

const toneColor: Record<Tone, string> = {
  good: "#22c98a",
  warn: "#ffb020",
  bad: "#ff4d5e",
  info: "#4aa3ff",
  cyan: "#2ee6d6",
  idle: "#5b6678",
};

/** LED físico con halo. `pulse` para estados activos/alerta. */
export function Led({
  tone = "idle",
  pulse = false,
  size = 9,
}: {
  tone?: Tone;
  pulse?: boolean;
  size?: number;
}) {
  const c = toneColor[tone];
  return (
    <span
      className={pulse ? "animate-pulse-led" : ""}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: c,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 0 8px 1px ${c}, 0 0 2px ${c} inset`,
      }}
    />
  );
}

export function Pill({
  tone = "idle",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const c = toneColor[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] ${className}`}
      style={{
        borderColor: `${c}55`,
        color: c,
        background: `${c}12`,
      }}
    >
      {children}
    </span>
  );
}

/** Caja instrumento con esquinas en L y etiqueta superior. */
export function Instrument({
  label,
  right,
  children,
  className = "",
  glow,
}: {
  label?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  glow?: "cyan" | "amber" | "bad";
}) {
  const glowClass =
    glow === "cyan"
      ? "shadow-glow"
      : glow === "amber"
      ? "shadow-glow-amber"
      : glow === "bad"
      ? "shadow-glow-bad"
      : "";
  return (
    <section className={`panel ${glowClass} ${className}`}>
      <span className="corner left-0 top-0 border-l border-t rounded-tl-xl" />
      <span className="corner right-0 top-0 border-r border-t rounded-tr-xl" />
      <span className="corner bottom-0 left-0 border-b border-l rounded-bl-xl" />
      <span className="corner bottom-0 right-0 border-b border-r rounded-br-xl" />
      {(label || right) && (
        <header className="flex items-center justify-between gap-3 border-b border-base-700/70 px-4 py-2.5">
          {label ? <span className="label-cyan">{label}</span> : <span />}
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Tile de métrica con lectura mono grande. */
export function Metric({
  label,
  value,
  unit,
  tone = "cyan",
  sub,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: Tone;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-base-700/70 bg-base-850/60 px-3.5 py-3">
      <div className="label mb-1.5">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="readout text-2xl font-semibold leading-none"
          style={{ color: toneColor[tone] }}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-xs text-ink-faint">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 font-mono text-[11px] text-ink-dim">{sub}</div>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "active";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] transition-all disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50";
  const variants: Record<string, string> = {
    primary:
      "bg-cyan text-base-900 font-semibold hover:bg-cyan-glow shadow-glow",
    active:
      "border border-cyan/60 bg-cyan/10 text-cyan hover:bg-cyan/15",
    ghost:
      "border border-base-600 bg-base-750/60 text-ink-dim hover:border-base-600 hover:text-ink hover:bg-base-700/60",
    danger:
      "border border-bad/50 bg-bad/10 text-bad hover:bg-bad/15",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-base-600 border-t-cyan" />
      {label ?? "Cargando…"}
    </div>
  );
}
