import { firebaseEnabled } from "@/lib/firebase";
import type { DataProvider } from "./provider";
import { demoProvider } from "./demo";

let cached: DataProvider | null = null;

/** Devuelve la implementación activa de la capa de datos. */
export function getData(): DataProvider {
  if (cached) return cached;
  if (firebaseEnabled) {
    // import diferido para no cargar el SDK de DB en modo demo
    // (firebaseProvider usa firebase/database)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { firebaseProvider } = require("./firebaseProvider") as typeof import("./firebaseProvider");
    cached = firebaseProvider;
  } else {
    cached = demoProvider;
  }
  return cached;
}

export { firebaseEnabled };
export type { DataProvider, NewTankInput, Unsubscribe } from "./provider";
