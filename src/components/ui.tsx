import { type ReactNode } from "react";

type Tone = "good" | "warn" | "bad" | "info" | "idle" | "cyan";

const toneColor: Record<Tone, string> = {
  good: "#48b07f",
  warn: "#d6a23e",
  bad: "#dd5a68",
  info: "#5b93d6",
  cyan: "#4b8ef0",
  idle: "#69737f",
};

/** Indicador de estado discreto. `pulse` solo para estados vivos/alerta. */
export function Led({
  tone = "idle",
  pulse = false,
  size = 8,
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
        boxShadow: `0 0 0 3px ${c}22`,
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${className}`}
      style={{
        color: c,
        background: `${c}1a`,
        border: `1px solid ${c}33`,
      }}
    >
      {children}
    </span>
  );
}

/** Tarjeta de sección con encabezado simple. */
export function Instrument({
  label,
  right,
  children,
  className = "",
}: {
  label?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(label || right) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-base-700 px-4 py-3">
          {label ? (
            <h2 className="text-sm font-semibold text-ink">{label}</h2>
          ) : (
            <span />
          )}
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Métrica con lectura numérica grande. */
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
    <div className="rounded-md border border-base-700 bg-base-850 px-3.5 py-3">
      <div className="label mb-1.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <span
          className="readout text-2xl font-semibold leading-none"
          style={{ color: toneColor[tone] }}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-ink-faint">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-ink-dim">{sub}</div>}
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
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50";
  const variants: Record<string, string> = {
    primary: "bg-cyan text-white font-semibold hover:bg-cyan-deep",
    active: "border border-cyan/60 bg-cyan/10 text-cyan hover:bg-cyan/15",
    ghost:
      "border border-base-600 bg-base-750 text-ink-dim hover:text-ink hover:border-base-600 hover:bg-base-700",
    danger: "border border-bad/50 bg-bad/10 text-bad hover:bg-bad/15",
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
    <div className="flex items-center gap-3 text-sm text-ink-dim">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-base-600 border-t-cyan" />
      {label ?? "Cargando…"}
    </div>
  );
}
