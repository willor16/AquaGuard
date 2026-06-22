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

/** Indicador de estado discreto. `pulse` parpadea; `ping` añade un halo expansivo para estados vivos. */
export function Led({
  tone = "idle",
  pulse = false,
  ping = false,
  size = 8,
}: {
  tone?: Tone;
  pulse?: boolean;
  ping?: boolean;
  size?: number;
}) {
  const c = toneColor[tone];
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {ping && (
        <span
          className="animate-ping-ring absolute inset-0 rounded-full"
          style={{ background: c, opacity: 0.7 }}
        />
      )}
      <span
        className={`relative inline-block rounded-full transition-all duration-300 ${pulse ? "animate-pulse-led" : ""}`}
        style={{
          width: size,
          height: size,
          background: c,
          boxShadow: `0 0 0 2px ${c}33, inset 0 1px 1px ${c}66`,
        }}
      />
    </span>
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-200 ${className}`}
      style={{
        color: c,
        background: `${c}22`,
        border: `1.5px solid ${c}55`,
        boxShadow: `0 0 0 2px ${c}0a`,
      }}
    >
      {children}
    </span>
  );
}

/** Interruptor accesible y compacto, con realimentación animada. */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border-2 transition-all duration-250 ease-smooth disabled:opacity-40 ${
        checked ? "border-cyan bg-cyan/40 shadow-glow" : "border-base-600 bg-base-750"
      }`}
    >
      <span
        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-sm transition-all duration-250 ease-spring ${
          checked ? "left-[calc(100%-1.35rem)] bg-cyan" : "left-0.5 bg-ink-dim"
        }`}
      />
    </button>
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
    <section className={`panel animate-fade-up ${className}`}>
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
  const c = toneColor[tone];
  return (
    <div className="rounded-lg border border-base-700 bg-base-850 px-4 py-3.5 transition-all duration-300 hover:border-base-600 hover:shadow-panel">
      <div className="label mb-2 font-medium tracking-wide">{label}</div>
      <div className="flex items-baseline gap-2">
        <span
          className="readout text-3xl font-bold leading-none tracking-tight"
          style={{ color: c }}
        >
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-ink-faint">{unit}</span>}
      </div>
      {sub && <div className="mt-2 text-[11px] font-medium text-ink-dim">{sub}</div>}
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
    "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 ease-smooth active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";
  const variants: Record<string, string> = {
    primary: "bg-cyan text-white shadow-sm hover:bg-cyan-deep hover:shadow-panel",
    active: "border border-cyan/50 bg-cyan/15 text-cyan hover:bg-cyan/20 hover:border-cyan/70",
    ghost: "border border-base-600 bg-base-750 text-ink-dim hover:border-base-500 hover:bg-base-700 hover:text-ink",
    danger: "border border-bad/60 bg-bad/15 text-bad hover:bg-bad/20 hover:border-bad/80",
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
    <div className="flex flex-col items-center gap-3 text-sm text-ink-dim">
      <span className="relative h-7 w-7">
        <span className="absolute inset-0 rounded-full border-2 border-base-700" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan" />
      </span>
      {label && <span className="animate-pulse">{label}</span>}
    </div>
  );
}
