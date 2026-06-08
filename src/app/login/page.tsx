"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui";
import { useTicker } from "@/lib/hooks";
import { clockTime } from "@/lib/format";

export default function LoginPage() {
  const { signIn, user, mode } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useTicker(1000);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      {/* fondo: rejilla + reactor */}
      <div className="pointer-events-none absolute inset-0 bg-grid-fine [background-size:32px_32px] opacity-[0.5]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/5 blur-[120px]" />

      <div className="relative w-full max-w-md">
        {/* encabezado */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg border border-cyan/40 bg-cyan/10 font-mono text-xl text-cyan shadow-glow">
              ◈
            </span>
            <div className="leading-none">
              <div className="font-mono text-lg font-bold tracking-[0.2em] text-ink">
                TANK<span className="text-cyan">·</span>CTRL
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.28em] text-ink-faint">
                control supervisor de tanques
              </div>
            </div>
          </div>
          <span className="font-mono text-xs tabular-nums text-ink-faint">
            {clockTime(Math.floor(t / 1000))}
          </span>
        </div>

        <form onSubmit={submit} className="panel scanlines panel-grid p-6">
          <div className="mb-5 flex items-center justify-between">
            <span className="label-cyan">acceso al sistema</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              {mode === "demo" ? "● demo local" : "● firebase auth"}
            </span>
          </div>

          <label className="mb-1.5 block label">correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operador@dominio.gt"
            autoComplete="username"
            className="mb-4 w-full rounded-lg border border-base-600 bg-base-900/60 px-3.5 py-2.5 font-mono text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20"
          />

          <label className="mb-1.5 block label">contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "demo" ? "(opcional en demo)" : "••••••••"}
            autoComplete="current-password"
            className="mb-5 w-full rounded-lg border border-base-600 bg-base-900/60 px-3.5 py-2.5 font-mono text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20"
          />

          {error && (
            <div className="mb-4 rounded-md border border-bad/40 bg-bad/10 px-3 py-2 font-mono text-[11px] text-bad">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" disabled={busy} className="w-full">
            {busy ? "conectando…" : "iniciar sesión"}
          </Button>

          {mode === "demo" && (
            <button
              type="button"
              onClick={() => {
                setEmail("operador@demo.local");
                setTimeout(submit, 0);
              }}
              className="mt-3 w-full rounded-lg border border-dashed border-base-600 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim transition hover:border-cyan/50 hover:text-cyan"
            >
              entrar como operador demo
            </button>
          )}
        </form>

        <p className="mt-4 text-center font-mono text-[10px] leading-relaxed text-ink-faint">
          {mode === "demo"
            ? "sin credenciales firebase · datos simulados en vivo"
            : "autenticación gestionada por firebase · reglas activas"}
        </p>
      </div>
    </div>
  );
}
