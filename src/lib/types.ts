// Contrato de datos de la app (espejo de la estructura en Firebase Realtime DB).
// Ver especificacion-app-web-tanque.md §6.

export type Mode = "auto" | "manual";
export type ActuationStrategy = "single" | "both" | "priority";
export type Role = "admin" | "operador" | "lectura";
export type ActuatorKind = "pump" | "valve";

export type AlertCode =
  | "DRY_RUN"
  | "NO_PRESSURE"
  | "OVERFLOW"
  | "SENSOR_FAULT"
  | "OFFLINE";

export type EventType =
  | "PUMP_ON"
  | "PUMP_OFF"
  | "VALVE_ON"
  | "VALVE_OFF"
  | "ALERT"
  | "MODE_CHANGE"
  | "CONFIG_CHANGE"
  | "ESTOP_ON"
  | "ESTOP_OFF"
  | "MAINT_START"
  | "MAINT_END";

/** Ventana de mantenimiento programado. Mientras está activa, se suspende el llenado automático. */
export interface MaintenanceWindow {
  id: string;
  title: string;
  startTs: number; // epoch (s)
  endTs: number; // epoch (s)
  note?: string;
  disableAuto: boolean; // suspender llenado automático durante la ventana
  createdBy?: string;
}

export interface ActuatorConfig {
  enabled: boolean;
  /** Canal físico en el módulo de relés (1..N). Permite mapear varios actuadores a una tira de relés. */
  relayChannel?: number | null;
}

export interface TankMeta {
  name: string;
  location?: string;
}

export interface TankConfig {
  mode: Mode;
  startPct: number; // umbral de encendido
  stopPct: number; // umbral de apagado
  actuators: {
    pump: ActuatorConfig;
    valve: ActuatorConfig;
  };
  actuationStrategy: ActuationStrategy;
  /** Paro de emergencia: bloquea todos los actuadores hasta reanudar. */
  emergencyStop?: boolean;
  /** Mantenimientos programados (id → ventana). */
  maintenance?: Record<string, MaintenanceWindow>;
}

export interface TankDesired {
  pumpManual: boolean | null;
  valveManual: boolean | null;
  requestedMode: Mode | null;
}

export interface SensorHealth {
  invalidRatePct: number;
  noiseStd: number;
  status: "ok" | "degraded";
}

export interface TankReported {
  levelPct: number;
  distanceCm: number;
  pumpOn: boolean;
  valveOn: boolean;
  cisternHasWater: boolean;
  online: boolean;
  lastSeen: number; // epoch en segundos
  sensorHealth: SensorHealth;
  mode: Mode;
}

export interface Alert {
  code: AlertCode;
  message: string;
  ts: number;
  active: boolean;
}

export interface TankEvent {
  ts: number;
  type: EventType;
  detail?: string;
}

export interface HistoryPoint {
  ts: number; // epoch en segundos
  levelPct: number;
}

export interface Tank {
  meta: TankMeta;
  config: TankConfig;
  desired: TankDesired;
  reported: TankReported;
  alerts: Record<string, Alert>;
  events: Record<string, TankEvent>;
}

export interface TankSummary {
  tankId: string;
  meta: TankMeta;
  reported: TankReported;
  config: TankConfig;
  activeAlerts: number;
}

export interface AppUser {
  uid: string;
  email: string | null;
  role: Role;
  tanks: Record<string, boolean>;
}

/** Umbral de heartbeat para considerar offline (especificacion §10). */
export const OFFLINE_THRESHOLD_S = 60;

/** Tiempo tras el cual un comando sin confirmar se marca como "sin confirmación" (§11). */
export const COMMAND_TIMEOUT_MS = 8000;
