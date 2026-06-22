import { useEffect, useRef, useState } from "react";

/**
 * Anima un número de 0 → target una sola vez (al montar), y luego sigue el
 * valor en vivo sin volver a animar. Da el efecto "dashboard que cobra vida"
 * sin temblar cuando los datos se actualizan en tiempo real.
 */
export function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // respeta a quien prefiere menos movimiento
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce || started.current) {
      setValue(target);
      return;
    }
    started.current = true;

    const to = target;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(to * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setValue(to);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}
