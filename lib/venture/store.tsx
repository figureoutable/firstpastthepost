"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  createCallbackFeaStorage,
  effectiveEconomicTerms,
  type FeaStorage,
} from "@/lib/fea";
import { migrateToFeaState } from "@/lib/fea/migrate-legacy";
import type { FeaInvestor, FeaRaise, VentureState } from "./types";
import { createSeedVentureState } from "./seed-data";

const STORAGE_KEY = "figures-venture-state-v9";

interface VentureContextValue {
  state: VentureState;
  setState: Dispatch<SetStateAction<VentureState>>;
  resetDemoData: () => void;
  /** FEA persistence facade over `state.safe` (no direct localStorage in lib/fea). */
  feaStorage: FeaStorage;
}

const VentureContext = createContext<VentureContextValue | null>(null);

function normalizeState(parsed: VentureState): VentureState {
  return {
    ...parsed,
    safe: migrateToFeaState(parsed.safe),
  };
}

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
    return normalizeState(parsed);
  } catch {
    return createSeedVentureState();
  }
}

export function VentureProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VentureState>(() => createSeedVentureState());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

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
      // ignore storage errors
    }
  }, [state, hydrated]);

  const feaStorage = useMemo(
    () =>
      createCallbackFeaStorage(
        () => stateRef.current.safe,
        (nextSafe) => {
          setState((prev) => ({ ...prev, safe: nextSafe }));
        }
      ),
    []
  );

  const resetDemoData = () => setState(createSeedVentureState());

  const value = useMemo(
    () => ({ state, setState, resetDemoData, feaStorage }),
    [state, feaStorage]
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

/** @deprecated Prefer `effectiveEconomicTerms` from `@/lib/fea`. */
export function effectiveRaiseTerms(raise: FeaRaise, investor?: FeaInvestor | null) {
  return effectiveEconomicTerms(raise, investor);
}

export { effectiveEconomicTerms };
