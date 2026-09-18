"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { VentureState } from "./types";
import { createSeedVentureState } from "./seed-data";

const STORAGE_KEY = "figures-venture-state-v3";

interface VentureContextValue {
  state: VentureState;
  setState: Dispatch<SetStateAction<VentureState>>;
  resetDemoData: () => void;
}

const VentureContext = createContext<VentureContextValue | null>(null);

function loadInitialState(): VentureState {
  if (typeof window === "undefined") {
    return createSeedVentureState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedVentureState();
    const parsed = JSON.parse(raw) as VentureState;
    if (!parsed || typeof parsed !== "object" || !parsed.eligibility) {
      return createSeedVentureState();
    }
    return parsed;
  } catch {
    return createSeedVentureState();
  }
}

export function VentureProvider({ children }: { children: React.ReactNode }) {
  // Always start from the same seed data on both server and client so the
  // initial render matches (localStorage isn't available during SSR). Any
  // persisted state is loaded in the effect below, after hydration.
  const [state, setState] = useState<VentureState>(() => createSeedVentureState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadInitialState());
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors (private browsing, quota, etc.)
    }
  }, [state, hydrated]);

  const resetDemoData = () => setState(createSeedVentureState());

  const value = useMemo(
    () => ({ state, setState, resetDemoData }),
    [state]
  );

  return (
    <VentureContext.Provider value={value}>{children}</VentureContext.Provider>
  );
}

export function useVenture() {
  const ctx = useContext(VentureContext);
  if (!ctx) {
    throw new Error("useVenture must be used within a VentureProvider");
  }
  return ctx;
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
