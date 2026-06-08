"use client";

import { useEffect, useState } from "react";
import { getData } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import type { HistoryPoint, Tank, TankSummary } from "@/lib/types";

export function useTanksList(): { tanks: TankSummary[]; loading: boolean } {
  const { user } = useAuth();
  const [tanks, setTanks] = useState<TankSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = getData().subscribeTanks(user, (t) => {
      setTanks(t);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return { tanks, loading };
}

export function useTank(tankId: string): { tank: Tank | null; loading: boolean } {
  const [tank, setTank] = useState<Tank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = getData().subscribeTank(tankId, (t) => {
      setTank(t);
      setLoading(false);
    });
    return unsub;
  }, [tankId]);

  return { tank, loading };
}

export function useHistory(tankId: string): HistoryPoint[] {
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  useEffect(() => {
    const unsub = getData().subscribeHistory(tankId, setPoints);
    return unsub;
  }, [tankId]);
  return points;
}

/** Reloj que avanza cada segundo, para recalcular online/offline y tiempos relativos. */
export function useTicker(intervalMs = 1000): number {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return t;
}
