import type {
  Alert,
  HistoryPoint,
  MaintenanceWindow,
  Tank,
  TankConfig,
  TankDesired,
  TankEvent,
  TankSummary,
  AppUser,
} from "@/lib/types";
import { activeMaintenance } from "@/lib/maintenance";
import type { DataProvider, NewTankInput, Unsubscribe } from "./provider";

const STORAGE_KEY = "tanque.demo.v1";
const TICK_MS = 1000;
const HISTORY_EVERY_TICKS = 5;
const MAX_HISTORY = 360;
const TANK_HEIGHT_CM = 130;

interface DemoTank {
  tankId: string;
  tank: Tank;
  history: HistoryPoint[];
  // estado interno de simulación (no se expone)
  sim: {
    cisternDrought: number; // ticks restantes de cisterna seca (drama de demo)
    sensorGlitch: number; // ticks restantes de sensor degradado
    ticks: number;
    maintActive: boolean; // ventana de mantenimiento activa el tick anterior
  };
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

function levelToDistance(levelPct: number): number {
  return Math.round(((100 - levelPct) / 100) * TANK_HEIGHT_CM * 10) / 10;
}

// ---------------------------------------------------------------------------
// Semilla: 3 tanques con configuraciones distintas para lucir el multi-tanque.
// ---------------------------------------------------------------------------
function seedTank(
  tankId: string,
  name: string,
  location: string,
  config: TankConfig,
  level: number
): DemoTank {
  const t = now();
  return {
    tankId,
    history: [],
    sim: { cisternDrought: 0, sensorGlitch: 0, ticks: 0, maintActive: false },
    tank: {
      meta: { name, location },
      config,
      desired: { pumpManual: null, valveManual: null, requestedMode: null },
      reported: {
        levelPct: level,
        distanceCm: levelToDistance(level),
        pumpOn: false,
        valveOn: false,
        cisternHasWater: true,
        online: true,
        lastSeen: t,
        sensorHealth: { invalidRatePct: 0.8, noiseStd: 0.3, status: "ok" },
        mode: config.mode,
      },
      alerts: {},
      events: {
        [uid("ev")]: { ts: t, type: "MODE_CHANGE", detail: "Arranque del sistema" },
      },
    },
  };
}

function defaultSeed(): Record<string, DemoTank> {
  const tanks: DemoTank[] = [
    seedTank(
      "canton-norte",
      "Tanque Cantón Norte",
      "Sector Norte · Bomba + Válvula",
      {
        mode: "auto",
        startPct: 30,
        stopPct: 90,
        actuators: {
          pump: { enabled: true, relayChannel: 1 },
          valve: { enabled: true, relayChannel: 2 },
        },
        actuationStrategy: "priority",
      },
      58
    ),
    seedTank(
      "escuela",
      "Tanque Escuela Rural",
      "Escuela · Solo bomba",
      {
        mode: "auto",
        startPct: 35,
        stopPct: 85,
        actuators: {
          pump: { enabled: true, relayChannel: 3 },
          valve: { enabled: false, relayChannel: null },
        },
        actuationStrategy: "single",
      },
      41
    ),
    seedTank(
      "clinica",
      "Tanque Clínica",
      "Clínica · Solo válvula de red",
      {
        mode: "manual",
        startPct: 40,
        stopPct: 95,
        actuators: {
          pump: { enabled: false, relayChannel: null },
          valve: { enabled: true, relayChannel: 4 },
        },
        actuationStrategy: "single",
      },
      72
    ),
  ];
  const map: Record<string, DemoTank> = {};
  for (const t of tanks) map[t.tankId] = t;

  // mantenimiento programado de ejemplo (mañana) para lucir el calendario
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const startTs = Math.floor(tomorrow.getTime() / 1000);
  map["canton-norte"].tank.config.maintenance = {
    m_seed1: {
      id: "m_seed1",
      title: "Limpieza programada del tanque",
      startTs,
      endTs: startTs + 2 * 3600,
      note: "Cuadrilla de mantenimiento · cantón norte",
      disableAuto: true,
      createdBy: "operador@demo.local",
    },
  };
  return map;
}

// ---------------------------------------------------------------------------
// Store singleton (solo en cliente)
// ---------------------------------------------------------------------------
class DemoStore {
  tanks: Record<string, DemoTank> = {};
  private listListeners = new Set<(t: TankSummary[]) => void>();
  private tankListeners = new Map<string, Set<(t: Tank | null) => void>>();
  private historyListeners = new Map<string, Set<(h: HistoryPoint[]) => void>>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.load();
    this.start();
  }

  private load() {
    if (typeof window === "undefined") {
      this.tanks = defaultSeed();
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.tanks = JSON.parse(raw);
        // asegurar campos sim
        for (const id of Object.keys(this.tanks)) {
          if (!this.tanks[id].sim)
            this.tanks[id].sim = {
              cisternDrought: 0,
              sensorGlitch: 0,
              ticks: 0,
              maintActive: false,
            };
          if (!this.tanks[id].history) this.tanks[id].history = [];
        }
        return;
      }
    } catch {
      /* ignore */
    }
    this.tanks = defaultSeed();
    this.persist();
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tanks));
    } catch {
      /* ignore */
    }
  }

  private start() {
    if (typeof window === "undefined" || this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  // ----- simulación de un "dispositivo" por tanque -----
  private tick() {
    const t = now();
    for (const id of Object.keys(this.tanks)) {
      this.simulate(this.tanks[id], t);
    }
    this.persist();
    this.notifyAll();
  }

  private logEvent(dt: DemoTank, ev: TankEvent) {
    dt.tank.events[uid("ev")] = ev;
    // recortar a 60 eventos
    const keys = Object.keys(dt.tank.events);
    if (keys.length > 60) {
      keys
        .sort((a, b) => dt.tank.events[a].ts - dt.tank.events[b].ts)
        .slice(0, keys.length - 60)
        .forEach((k) => delete dt.tank.events[k]);
    }
  }

  private setAlert(dt: DemoTank, code: Alert["code"], message: string, on: boolean) {
    const existingKey = Object.keys(dt.tank.alerts).find(
      (k) => dt.tank.alerts[k].code === code
    );
    if (on) {
      if (existingKey && dt.tank.alerts[existingKey].active) return;
      const key = existingKey ?? uid("al");
      dt.tank.alerts[key] = { code, message, ts: now(), active: true };
      this.logEvent(dt, { ts: now(), type: "ALERT", detail: `${code}: ${message}` });
    } else if (existingKey && dt.tank.alerts[existingKey].active) {
      dt.tank.alerts[existingKey].active = false;
    }
  }

  private simulate(dt: DemoTank, t: number) {
    const { config, desired, reported } = dt.tank;
    dt.sim.ticks++;

    // Heartbeat: el dispositivo demo siempre está vivo.
    reported.lastSeen = t;
    reported.online = true;

    // ---- aplicar cambio de modo solicitado (el dispositivo consume desired) ----
    if (desired.requestedMode && desired.requestedMode !== reported.mode) {
      reported.mode = desired.requestedMode;
      config.mode = desired.requestedMode;
      this.logEvent(dt, {
        ts: t,
        type: "MODE_CHANGE",
        detail: `Modo → ${desired.requestedMode.toUpperCase()}`,
      });
      desired.requestedMode = null;
    }

    // ---- cisterna (drama de demo: a veces se seca) ----
    if (dt.sim.cisternDrought > 0) {
      dt.sim.cisternDrought--;
      reported.cisternHasWater = false;
    } else {
      reported.cisternHasWater = true;
      if (Math.random() < 0.002) dt.sim.cisternDrought = 25; // ~25 s seca
    }

    // ---- salud del sensor ----
    if (dt.sim.sensorGlitch > 0) {
      dt.sim.sensorGlitch--;
      reported.sensorHealth = {
        invalidRatePct: 6 + Math.random() * 4,
        noiseStd: 1.4 + Math.random(),
        status: "degraded",
      };
    } else {
      reported.sensorHealth = {
        invalidRatePct: Math.round((0.5 + Math.random()) * 10) / 10,
        noiseStd: Math.round((0.2 + Math.random() * 0.3) * 10) / 10,
        status: "ok",
      };
      if (Math.random() < 0.0015) dt.sim.sensorGlitch = 20;
    }
    this.setAlert(
      dt,
      "SENSOR_FAULT",
      "Sensor reportando lecturas inestables",
      reported.sensorHealth.status === "degraded"
    );

    // ---- decidir qué actuadores quiere el dispositivo ----
    const pumpEnabled = config.actuators.pump.enabled;
    const valveEnabled = config.actuators.valve.enabled;
    let wantPump = false;
    let wantValve = false;

    if (reported.mode === "auto") {
      const filling = reported.levelPct <= config.startPct;
      const full = reported.levelPct >= config.stopPct;
      // histéresis simple usando el estado actual
      const wantFill = filling || (!full && (reported.pumpOn || reported.valveOn));
      if (wantFill) {
        if (config.actuationStrategy === "both") {
          wantPump = pumpEnabled;
          wantValve = valveEnabled;
        } else if (config.actuationStrategy === "priority") {
          wantPump = pumpEnabled;
          wantValve = pumpEnabled ? false : valveEnabled;
        } else {
          // single: el primero disponible
          wantPump = pumpEnabled;
          wantValve = pumpEnabled ? false : valveEnabled;
        }
      }
    } else {
      // manual: seguir comandos
      wantPump = pumpEnabled && desired.pumpManual === true;
      wantValve = valveEnabled && desired.valveManual === true;
    }

    // ---- mantenimiento programado: suspende el llenado automático ----
    const maint = activeMaintenance(config, t);
    const maintNowActive = !!maint;
    if (maint && maint.disableAuto && reported.mode === "auto") {
      wantPump = false;
      wantValve = false;
    }
    if (maintNowActive && !dt.sim.maintActive) {
      this.logEvent(dt, { ts: t, type: "MAINT_START", detail: maint!.title });
    } else if (!maintNowActive && dt.sim.maintActive) {
      this.logEvent(dt, { ts: t, type: "MAINT_END" });
    }
    dt.sim.maintActive = maintNowActive;

    // ---- paro de emergencia: bloquea todos los actuadores ----
    if (config.emergencyStop) {
      wantPump = false;
      wantValve = false;
    }

    // ---- protecciones del dispositivo ----
    // anti marcha en seco: la bomba necesita agua en la cisterna
    const dryRun = wantPump && !reported.cisternHasWater;
    if (dryRun) wantPump = false;
    this.setAlert(dt, "DRY_RUN", "Cisterna vacía: bomba bloqueada", dryRun);

    // ---- aplicar y registrar cambios de estado ----
    if (wantPump !== reported.pumpOn) {
      reported.pumpOn = wantPump;
      this.logEvent(dt, { ts: t, type: wantPump ? "PUMP_ON" : "PUMP_OFF" });
    }
    if (wantValve !== reported.valveOn) {
      reported.valveOn = wantValve;
      this.logEvent(dt, { ts: t, type: wantValve ? "VALVE_ON" : "VALVE_OFF" });
    }

    // ---- física del nivel ----
    let delta = 0;
    if (reported.pumpOn) delta += 0.9;
    if (reported.valveOn) delta += 0.55;
    delta -= 0.32; // consumo / demanda
    delta += (Math.random() - 0.5) * 0.08; // ruido
    reported.levelPct = clamp(Math.round((reported.levelPct + delta) * 10) / 10, 0, 100);
    reported.distanceCm = levelToDistance(reported.levelPct);

    // ---- sobrenivel ----
    this.setAlert(dt, "OVERFLOW", "Nivel por encima del 98 %", reported.levelPct >= 98);

    // ---- histórico ----
    if (dt.sim.ticks % HISTORY_EVERY_TICKS === 0) {
      dt.history.push({ ts: t, levelPct: reported.levelPct });
      if (dt.history.length > MAX_HISTORY) dt.history.shift();
    }
  }

  // ----- notificación a suscriptores -----
  private summaries(user?: AppUser): TankSummary[] {
    return Object.values(this.tanks)
      .filter((dt) => !user || user.role === "admin" || user.tanks[dt.tankId])
      .map((dt) => ({
        tankId: dt.tankId,
        meta: dt.tank.meta,
        reported: dt.tank.reported,
        config: dt.tank.config,
        activeAlerts: Object.values(dt.tank.alerts).filter((a) => a.active).length,
      }));
  }

  private notifyAll() {
    const list = this.summaries();
    this.listListeners.forEach((cb) => cb(list));
    this.tankListeners.forEach((set, id) => {
      const dt = this.tanks[id];
      set.forEach((cb) => cb(dt ? structuredClone(dt.tank) : null));
    });
    this.historyListeners.forEach((set, id) => {
      const dt = this.tanks[id];
      set.forEach((cb) => cb(dt ? [...dt.history] : []));
    });
  }

  // ----- API -----
  subscribeTanks(user: AppUser, cb: (t: TankSummary[]) => void): Unsubscribe {
    this.listListeners.add(cb);
    cb(this.summaries(user));
    return () => this.listListeners.delete(cb);
  }

  subscribeTank(tankId: string, cb: (t: Tank | null) => void): Unsubscribe {
    if (!this.tankListeners.has(tankId)) this.tankListeners.set(tankId, new Set());
    const set = this.tankListeners.get(tankId)!;
    set.add(cb);
    const dt = this.tanks[tankId];
    cb(dt ? structuredClone(dt.tank) : null);
    return () => set.delete(cb);
  }

  subscribeHistory(tankId: string, cb: (h: HistoryPoint[]) => void): Unsubscribe {
    if (!this.historyListeners.has(tankId))
      this.historyListeners.set(tankId, new Set());
    const set = this.historyListeners.get(tankId)!;
    set.add(cb);
    const dt = this.tanks[tankId];
    cb(dt ? [...dt.history] : []);
    return () => set.delete(cb);
  }

  writeConfig(tankId: string, patch: Partial<TankConfig>) {
    const dt = this.tanks[tankId];
    if (!dt) return;
    dt.tank.config = { ...dt.tank.config, ...patch };
    this.logEvent(dt, { ts: now(), type: "CONFIG_CHANGE", detail: "Configuración actualizada" });
    this.persist();
    this.notifyAll();
  }

  writeDesired(tankId: string, patch: Partial<TankDesired>) {
    const dt = this.tanks[tankId];
    if (!dt) return;
    dt.tank.desired = { ...dt.tank.desired, ...patch };
    this.persist();
    this.notifyAll();
  }

  setEmergencyStop(tankId: string, value: boolean) {
    const dt = this.tanks[tankId];
    if (!dt) return;
    dt.tank.config.emergencyStop = value;
    this.logEvent(dt, {
      ts: now(),
      type: value ? "ESTOP_ON" : "ESTOP_OFF",
      detail: value ? "Paro de emergencia activado" : "Operación reanudada",
    });
    this.persist();
    this.notifyAll();
  }

  upsertMaintenance(tankId: string, window: MaintenanceWindow) {
    const dt = this.tanks[tankId];
    if (!dt) return;
    if (!dt.tank.config.maintenance) dt.tank.config.maintenance = {};
    dt.tank.config.maintenance[window.id] = window;
    this.logEvent(dt, {
      ts: now(),
      type: "CONFIG_CHANGE",
      detail: `Mantenimiento programado: ${window.title}`,
    });
    this.persist();
    this.notifyAll();
  }

  deleteMaintenance(tankId: string, windowId: string) {
    const dt = this.tanks[tankId];
    if (!dt || !dt.tank.config.maintenance) return;
    delete dt.tank.config.maintenance[windowId];
    this.persist();
    this.notifyAll();
  }

  createTank(input: NewTankInput) {
    if (this.tanks[input.tankId]) throw new Error("Ya existe un tanque con ese ID");
    const dt = seedTank(
      input.tankId,
      input.meta.name,
      input.meta.location ?? "",
      input.config,
      50
    );
    this.tanks[input.tankId] = dt;
    this.persist();
    this.notifyAll();
  }

  deleteTank(tankId: string) {
    delete this.tanks[tankId];
    this.persist();
    this.notifyAll();
  }
}

// singleton perezoso (solo cliente)
let store: DemoStore | null = null;
function getStore(): DemoStore {
  if (!store) store = new DemoStore();
  return store;
}

export const demoProvider: DataProvider = {
  mode: "demo",
  subscribeTanks: (user, cb) => getStore().subscribeTanks(user, cb),
  subscribeTank: (id, cb) => getStore().subscribeTank(id, cb),
  subscribeHistory: (id, cb) => getStore().subscribeHistory(id, cb),
  writeConfig: async (id, patch) => getStore().writeConfig(id, patch),
  writeDesired: async (id, patch) => getStore().writeDesired(id, patch),
  setEmergencyStop: async (id, v) => getStore().setEmergencyStop(id, v),
  upsertMaintenance: async (id, w) => getStore().upsertMaintenance(id, w),
  deleteMaintenance: async (id, wid) => getStore().deleteMaintenance(id, wid),
  createTank: async (input) => getStore().createTank(input),
  deleteTank: async (id) => getStore().deleteTank(id),
};
