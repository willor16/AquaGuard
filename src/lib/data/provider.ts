import type {
  AppUser,
  CalibrationConfig,
  HistoryPoint,
  MaintenanceWindow,
  Tank,
  TankConfig,
  TankDesired,
  TankMeta,
  TankSummary,
} from "@/lib/types";

export type Unsubscribe = () => void;

/** Datos para dar de alta un tanque desde el panel de gestión. */
export interface NewTankInput {
  tankId: string;
  meta: TankMeta;
  config: TankConfig;
}

/**
 * Capa de datos común. Hay dos implementaciones intercambiables:
 *  - demo:     simula un dispositivo vivo en memoria + localStorage (sin Firebase).
 *  - firebase: lee/escribe contra Firebase Realtime Database respetando el contrato.
 * La UI nunca sabe cuál está activa.
 */
export interface DataProvider {
  readonly mode: "demo" | "firebase";

  // Listado / resumen (multi-tanque)
  subscribeTanks(user: AppUser, cb: (tanks: TankSummary[]) => void): Unsubscribe;

  // Tanque individual (monitoreo + control)
  subscribeTank(tankId: string, cb: (tank: Tank | null) => void): Unsubscribe;

  // Histórico para gráficas
  subscribeHistory(
    tankId: string,
    cb: (points: HistoryPoint[]) => void
  ): Unsubscribe;

  // Escrituras permitidas por el contrato (solo config/ y desired/)
  writeConfig(tankId: string, patch: Partial<TankConfig>): Promise<void>;
  writeDesired(tankId: string, patch: Partial<TankDesired>): Promise<void>;

  // Seguridad: paro de emergencia (se persiste en config/).
  setEmergencyStop(tankId: string, value: boolean): Promise<void>;

  // Mantenimiento programado (se persiste en config/maintenance/).
  upsertMaintenance(tankId: string, window: MaintenanceWindow): Promise<void>;
  deleteMaintenance(tankId: string, windowId: string): Promise<void>;

  // Calibración de sensores (se persiste en config/calibration/).
  writeCalibration(tankId: string, calibration: CalibrationConfig): Promise<void>;

  // Gestión de tanques (alta/baja). En Firebase real lo haría un admin/Cloud Function;
  // aquí la app escribe meta/ y config/ iniciales.
  createTank(input: NewTankInput): Promise<void>;
  deleteTank(tankId: string): Promise<void>;
}
