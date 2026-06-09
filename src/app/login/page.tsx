"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui";

export default function LoginPage() {
  const { signIn, user, mode } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        {/* marca */}
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-cyan/15 text-cyan">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M8 1.5C8 1.5 3 6.5 3 10a5 5 0 0 0 10 0c0-3.5-5-8.5-5-8.5Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight text-ink">AquaGuard</div>
            <div className="text-[12px] text-ink-faint">control supervisor de tanques</div>
          </div>
        </div>

        <form onSubmit={submit} className="panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Iniciar sesión</span>
            <span className="text-[11px] text-ink-faint">
              {mode === "demo" ? "demo local" : "firebase auth"}
            </span>
          </div>

          <label className="mb-1.5 block label">correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operador@dominio.gt"
            autoComplete="username"
            className="input mb-4"
          />

          <label className="mb-1.5 block label">contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "demo" ? "(opcional en demo)" : "••••••••"}
            autoComplete="current-password"
            className="input mb-5"
          />

          {error && (
            <div className="mb-4 rounded-md border border-bad/40 bg-bad/10 px-3 py-2 text-[12px] text-bad">
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
              className="mt-3 w-full rounded-md border border-dashed border-base-600 px-4 py-2.5 text-[13px] text-ink-dim transition hover:border-cyan/50 hover:text-cyan"
            >
              entrar como operador demo
            </button>
          )}
        </form>

        <p className="mt-4 text-center text-[12px] leading-relaxed text-ink-faint">
          {mode === "demo"
            ? "sin credenciales firebase · datos simulados en vivo"
            : "autenticación gestionada por firebase · reglas activas"}
        </p>
      </div>
    </div>
  );
}
