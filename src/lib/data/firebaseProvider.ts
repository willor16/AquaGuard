import {
  getDatabase,
  ref,
  onValue,
  update,
  set,
  remove,
  query,
  limitToLast,
} from "firebase/database";
import { getFirebaseApp } from "@/lib/firebase";
import type {
  AppUser,
  CalibrationConfig,
  HistoryPoint,
  MaintenanceWindow,
  Tank,
  TankConfig,
  TankDesired,
  TankReported,
  TankSummary,
} from "@/lib/types";
import { OFFLINE_THRESHOLD_S } from "@/lib/types";
import type { DataProvider, NewTankInput, Unsubscribe } from "./provider";

function db() {
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase no inicializado");
  return getDatabase(app);
}

function withOnline(r: TankReported): TankReported {
  const now = Math.floor(Date.now() / 1000);
  const online = !!r.lastSeen && now - r.lastSeen <= OFFLINE_THRESHOLD_S;
  return { ...r, online };
}

// Un tanque creado por el dispositivo (que solo escribe reported/) puede no tener
// config/. Rellenamos con valores por defecto para que la UI no se rompa.
function withConfig(c?: Partial<TankConfig>): TankConfig {
  return {
    mode: c?.mode ?? "auto",
    startPct: c?.startPct ?? 30,
    stopPct: c?.stopPct ?? 90,
    actuators: {
      pump: c?.actuators?.pump ?? { enabled: true, relayChannel: 1 },
      valve: c?.actuators?.valve ?? { enabled: false, relayChannel: null },
    },
    actuationStrategy: c?.actuationStrategy ?? "single",
    emergencyStop: c?.emergencyStop,
    maintenance: c?.maintenance,
    calibration: c?.calibration,
  };
}

export const firebaseProvider: DataProvider = {
  mode: "firebase",

  subscribeTanks(user: AppUser, cb: (t: TankSummary[]) => void): Unsubscribe {
    const ids =
      user.role === "admin" ? null : Object.keys(user.tanks || {});
    const r = ref(db(), "tanks");
    return onValue(r, (snap) => {
      const val = (snap.val() as Record<string, any>) || {};
      const out: TankSummary[] = Object.entries(val)
        .filter(([id]) => !ids || ids.includes(id))
        .map(([tankId, t]) => ({
          tankId,
          meta: t.meta || { name: tankId },
          config: withConfig(t.config),
          reported: withOnline(t.reported || ({} as TankReported)),
          activeAlerts: t.alerts
            ? Object.values<any>(t.alerts).filter((a) => a.active).length
            : 0,
        }));
      cb(out);
    });
  },

  subscribeTank(tankId: string, cb: (t: Tank | null) => void): Unsubscribe {
    const r = ref(db(), `tanks/${tankId}`);
    return onValue(r, (snap) => {
      const t = snap.val();
      if (!t) return cb(null);
      cb({
        meta: t.meta || { name: tankId },
        config: withConfig(t.config),
        desired: t.desired || { pumpManual: null, valveManual: null, requestedMode: null },
        reported: withOnline(t.reported || ({} as TankReported)),
        alerts: t.alerts || {},
        events: t.events || {},
      });
    });
  },

  subscribeHistory(tankId: string, cb: (h: HistoryPoint[]) => void): Unsubscribe {
    const r = query(ref(db(), `tanks/${tankId}/history`), limitToLast(360));
    return onValue(r, (snap) => {
      const val = (snap.val() as Record<string, any>) || {};
      const points: HistoryPoint[] = Object.entries(val)
        .map(([ts, v]) => ({ ts: Number(ts), levelPct: v.levelPct }))
        .sort((a, b) => a.ts - b.ts);
      cb(points);
    });
  },

  async writeConfig(tankId: string, patch: Partial<TankConfig>) {
    await update(ref(db(), `tanks/${tankId}/config`), patch);
  },

  async writeDesired(tankId: string, patch: Partial<TankDesired>) {
    await update(ref(db(), `tanks/${tankId}/desired`), patch);
  },

  async setEmergencyStop(tankId: string, value: boolean) {
    await update(ref(db(), `tanks/${tankId}/config`), { emergencyStop: value });
  },

  async upsertMaintenance(tankId: string, window: MaintenanceWindow) {
    await set(ref(db(), `tanks/${tankId}/config/maintenance/${window.id}`), window);
  },

  async deleteMaintenance(tankId: string, windowId: string) {
    await remove(ref(db(), `tanks/${tankId}/config/maintenance/${windowId}`));
  },

  async writeCalibration(tankId: string, calibration: CalibrationConfig) {
    await set(ref(db(), `tanks/${tankId}/config/calibration`), calibration);
  },

  async createTank(input: NewTankInput) {
    // La app solo siembra meta/ y config/ + desired/ inicial.
    // reported/ lo creará el dispositivo cuando se conecte (no lo tocamos).
    await set(ref(db(), `tanks/${input.tankId}/meta`), input.meta);
    await set(ref(db(), `tanks/${input.tankId}/config`), input.config);
    await set(ref(db(), `tanks/${input.tankId}/desired`), {
      pumpManual: null,
      valveManual: null,
      requestedMode: null,
    });
  },

  async deleteTank(tankId: string) {
    await remove(ref(db(), `tanks/${tankId}`));
  },
};
