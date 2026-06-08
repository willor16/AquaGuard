"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { firebaseEnabled, getFirebaseApp } from "@/lib/firebase";
import type { AppUser, Role } from "@/lib/types";

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  mode: "demo" | "firebase";
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const DEMO_KEY = "tanque.demo.session";

const DEMO_USER: AppUser = {
  uid: "demo-admin",
  email: "operador@demo.local",
  role: "admin",
  tanks: {},
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseEnabled) {
      // sesión demo persistida en localStorage
      try {
        const raw = window.localStorage.getItem(DEMO_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch {
        /* ignore */
      }
      setLoading(false);
      return;
    }

    let unsub = () => {};
    (async () => {
      const app = getFirebaseApp()!;
      const { getAuth, onAuthStateChanged } = await import("firebase/auth");
      const { getDatabase, ref, get } = await import("firebase/database");
      const auth = getAuth(app);
      unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (!fbUser) {
          setUser(null);
          setLoading(false);
          return;
        }
        const db = getDatabase(app);
        const snap = await get(ref(db, `users/${fbUser.uid}`));
        const profile = snap.val() || {};
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          role: (profile.role as Role) || "lectura",
          tanks: profile.tanks || {},
        });
        setLoading(false);
      });
    })();
    return () => unsub();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!firebaseEnabled) {
      const u: AppUser = { ...DEMO_USER, email: email || DEMO_USER.email };
      window.localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      setUser(u);
      return;
    }
    const app = getFirebaseApp()!;
    const { getAuth, signInWithEmailAndPassword } = await import("firebase/auth");
    await signInWithEmailAndPassword(getAuth(app), email, password);
  };

  const signOut = async () => {
    if (!firebaseEnabled) {
      window.localStorage.removeItem(DEMO_KEY);
      setUser(null);
      return;
    }
    const app = getFirebaseApp()!;
    const { getAuth, signOut: fbSignOut } = await import("firebase/auth");
    await fbSignOut(getAuth(app));
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, mode: firebaseEnabled ? "firebase" : "demo", signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}

/** Permisos derivados del rol. */
export function canControl(role?: Role): boolean {
  return role === "admin" || role === "operador";
}
export function canConfigure(role?: Role): boolean {
  return role === "admin" || role === "operador";
}
export function canManageTanks(role?: Role): boolean {
  return role === "admin";
}
