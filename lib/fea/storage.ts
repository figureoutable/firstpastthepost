/**
 * FEA persistence interface — no React, no window, no localStorage.
 * Venture local adapter implements this; a future DB adapter can replace it.
 */

import type {
  FeaGeneratedAgreement,
  FeaInvestor,
  FeaRaise,
  FeaState,
  GeneratedAgreementStatus,
} from "./types";
import { isGeneratedAgreementImmutable } from "./types";

export class FeaStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeaStorageError";
  }
}

export interface FeaStorage {
  getState(): FeaState;
  replaceState(next: FeaState): void;

  listRaises(): FeaRaise[];
  getRaise(raiseId: string): FeaRaise | null;
  upsertRaise(raise: FeaRaise): void;
  deleteRaise(raiseId: string): void;

  listInvestors(raiseId: string): FeaInvestor[];
  getInvestor(raiseId: string, investorId: string): FeaInvestor | null;
  /** Adds or updates an investor. Does not copy raise.defaultTerms onto the investor. */
  upsertInvestor(raiseId: string, investor: FeaInvestor): void;
  deleteInvestor(raiseId: string, investorId: string): void;

  listGeneratedAgreements(opts?: {
    raiseId?: string;
    investorId?: string;
  }): FeaGeneratedAgreement[];
  getGeneratedAgreement(id: string): FeaGeneratedAgreement | null;
  /**
   * Insert a new generated agreement row.
   * To regenerate after ISSUED: void the old row, then create a new DRAFT.
   */
  createGeneratedAgreement(
    agreement: FeaGeneratedAgreement
  ): FeaGeneratedAgreement;
  /**
   * Mutate a generated agreement. Throws if status is ISSUED, SIGNED, or VOID
   * (except allowing DRAFT → ISSUED / ISSUED → SIGNED / * → VOID transitions
   * via {@link transitionGeneratedAgreementStatus}).
   */
  updateGeneratedAgreementDraft(
    id: string,
    patch: Partial<
      Pick<
        FeaGeneratedAgreement,
        | "contextSnapshot"
        | "renderedMarkdown"
        | "pdfUrl"
        | "docxUrl"
        | "validationWarnings"
      >
    >
  ): FeaGeneratedAgreement;
  transitionGeneratedAgreementStatus(
    id: string,
    nextStatus: GeneratedAgreementStatus,
    opts?: { issuedAt?: string }
  ): FeaGeneratedAgreement;
}

/** Pure helpers shared by adapters. */

export function assertCanMutateGeneratedContent(
  agreement: FeaGeneratedAgreement
): void {
  if (isGeneratedAgreementImmutable(agreement.status)) {
    throw new FeaStorageError(
      `Cannot modify generated agreement ${agreement.id} while status is ${agreement.status}`
    );
  }
}

export function assertValidStatusTransition(
  from: GeneratedAgreementStatus,
  to: GeneratedAgreementStatus
): void {
  const allowed: Record<GeneratedAgreementStatus, GeneratedAgreementStatus[]> = {
    DRAFT: ["ISSUED", "VOID"],
    ISSUED: ["SIGNED", "VOID"],
    SIGNED: ["VOID"],
    VOID: [],
  };
  if (!allowed[from].includes(to)) {
    throw new FeaStorageError(
      `Invalid generated agreement status transition ${from} → ${to}`
    );
  }
}

export function emptyFeaState(): FeaState {
  return { raises: [], generatedAgreements: [] };
}

/**
 * In-memory adapter for tests and pure logic. Callers persist snapshots separately.
 */
export function createMemoryFeaStorage(initial?: FeaState): FeaStorage {
  let state: FeaState = initial
    ? structuredClone(initial)
    : emptyFeaState();

  const findRaise = (raiseId: string) =>
    state.raises.find((r) => r.id === raiseId) ?? null;

  return {
    getState: () => structuredClone(state),
    replaceState: (next) => {
      state = structuredClone(next);
    },

    listRaises: () => structuredClone(state.raises),
    getRaise: (raiseId) => {
      const raise = findRaise(raiseId);
      return raise ? structuredClone(raise) : null;
    },
    upsertRaise: (raise) => {
      const idx = state.raises.findIndex((r) => r.id === raise.id);
      if (idx >= 0) state.raises[idx] = structuredClone(raise);
      else state.raises = [structuredClone(raise), ...state.raises];
    },
    deleteRaise: (raiseId) => {
      state.raises = state.raises.filter((r) => r.id !== raiseId);
      state.generatedAgreements = state.generatedAgreements.filter(
        (a) => a.raiseId !== raiseId
      );
    },

    listInvestors: (raiseId) => {
      const raise = findRaise(raiseId);
      return raise ? structuredClone(raise.investors) : [];
    },
    getInvestor: (raiseId, investorId) => {
      const raise = findRaise(raiseId);
      const investor = raise?.investors.find((i) => i.id === investorId);
      return investor ? structuredClone(investor) : null;
    },
    upsertInvestor: (raiseId, investor) => {
      const raise = findRaise(raiseId);
      if (!raise) throw new FeaStorageError(`Raise ${raiseId} not found`);
      const idx = raise.investors.findIndex((i) => i.id === investor.id);
      if (idx >= 0) raise.investors[idx] = structuredClone(investor);
      else raise.investors = [...raise.investors, structuredClone(investor)];
    },
    deleteInvestor: (raiseId, investorId) => {
      const raise = findRaise(raiseId);
      if (!raise) return;
      raise.investors = raise.investors.filter((i) => i.id !== investorId);
      state.generatedAgreements = state.generatedAgreements.filter(
        (a) => !(a.raiseId === raiseId && a.investorId === investorId)
      );
    },

    listGeneratedAgreements: (opts) => {
      let rows = state.generatedAgreements;
      if (opts?.raiseId) rows = rows.filter((a) => a.raiseId === opts.raiseId);
      if (opts?.investorId)
        rows = rows.filter((a) => a.investorId === opts.investorId);
      return structuredClone(rows);
    },
    getGeneratedAgreement: (id) => {
      const row = state.generatedAgreements.find((a) => a.id === id);
      return row ? structuredClone(row) : null;
    },
    createGeneratedAgreement: (agreement) => {
      if (agreement.status !== "DRAFT") {
        throw new FeaStorageError(
          "New generated agreements must start as DRAFT"
        );
      }
      state.generatedAgreements = [
        structuredClone(agreement),
        ...state.generatedAgreements,
      ];
      return structuredClone(agreement);
    },
    updateGeneratedAgreementDraft: (id, patch) => {
      const idx = state.generatedAgreements.findIndex((a) => a.id === id);
      if (idx < 0) throw new FeaStorageError(`Agreement ${id} not found`);
      const current = state.generatedAgreements[idx];
      assertCanMutateGeneratedContent(current);
      const next = { ...current, ...patch };
      state.generatedAgreements[idx] = next;
      return structuredClone(next);
    },
    transitionGeneratedAgreementStatus: (id, nextStatus, opts) => {
      const idx = state.generatedAgreements.findIndex((a) => a.id === id);
      if (idx < 0) throw new FeaStorageError(`Agreement ${id} not found`);
      const current = state.generatedAgreements[idx];
      assertValidStatusTransition(current.status, nextStatus);
      const next: FeaGeneratedAgreement = {
        ...current,
        status: nextStatus,
        issuedAt:
          nextStatus === "ISSUED"
            ? opts?.issuedAt ?? new Date().toISOString().slice(0, 10)
            : current.issuedAt,
      };
      state.generatedAgreements[idx] = next;
      return structuredClone(next);
    },
  };
}

/**
 * Adapter over external state (e.g. VentureState.safe). No React / localStorage —
 * the host supplies get/set.
 */
export function createCallbackFeaStorage(
  getState: () => FeaState,
  setState: (next: FeaState) => void
): FeaStorage {
  const apply = (mutate: (draft: FeaState) => void) => {
    const draft = structuredClone(getState());
    mutate(draft);
    setState(draft);
  };

  return {
    getState: () => structuredClone(getState()),
    replaceState: (next) => setState(structuredClone(next)),

    listRaises: () => structuredClone(getState().raises),
    getRaise: (raiseId) => {
      const raise = getState().raises.find((r) => r.id === raiseId);
      return raise ? structuredClone(raise) : null;
    },
    upsertRaise: (raise) => {
      apply((draft) => {
        const idx = draft.raises.findIndex((r) => r.id === raise.id);
        if (idx >= 0) draft.raises[idx] = structuredClone(raise);
        else draft.raises = [structuredClone(raise), ...draft.raises];
      });
    },
    deleteRaise: (raiseId) => {
      apply((draft) => {
        draft.raises = draft.raises.filter((r) => r.id !== raiseId);
        draft.generatedAgreements = draft.generatedAgreements.filter(
          (a) => a.raiseId !== raiseId
        );
      });
    },

    listInvestors: (raiseId) => {
      const raise = getState().raises.find((r) => r.id === raiseId);
      return raise ? structuredClone(raise.investors) : [];
    },
    getInvestor: (raiseId, investorId) => {
      const raise = getState().raises.find((r) => r.id === raiseId);
      const investor = raise?.investors.find((i) => i.id === investorId);
      return investor ? structuredClone(investor) : null;
    },
    upsertInvestor: (raiseId, investor) => {
      apply((draft) => {
        const raise = draft.raises.find((r) => r.id === raiseId);
        if (!raise) throw new FeaStorageError(`Raise ${raiseId} not found`);
        const idx = raise.investors.findIndex((i) => i.id === investor.id);
        if (idx >= 0) raise.investors[idx] = structuredClone(investor);
        else raise.investors = [...raise.investors, structuredClone(investor)];
      });
    },
    deleteInvestor: (raiseId, investorId) => {
      apply((draft) => {
        const raise = draft.raises.find((r) => r.id === raiseId);
        if (!raise) return;
        raise.investors = raise.investors.filter((i) => i.id !== investorId);
        draft.generatedAgreements = draft.generatedAgreements.filter(
          (a) => !(a.raiseId === raiseId && a.investorId === investorId)
        );
      });
    },

    listGeneratedAgreements: (opts) => {
      let rows = getState().generatedAgreements;
      if (opts?.raiseId) rows = rows.filter((a) => a.raiseId === opts.raiseId);
      if (opts?.investorId)
        rows = rows.filter((a) => a.investorId === opts.investorId);
      return structuredClone(rows);
    },
    getGeneratedAgreement: (id) => {
      const row = getState().generatedAgreements.find((a) => a.id === id);
      return row ? structuredClone(row) : null;
    },
    createGeneratedAgreement: (agreement) => {
      if (agreement.status !== "DRAFT") {
        throw new FeaStorageError(
          "New generated agreements must start as DRAFT"
        );
      }
      apply((draft) => {
        draft.generatedAgreements = [
          structuredClone(agreement),
          ...draft.generatedAgreements,
        ];
      });
      return structuredClone(agreement);
    },
    updateGeneratedAgreementDraft: (id, patch) => {
      let updated: FeaGeneratedAgreement | null = null;
      apply((draft) => {
        const idx = draft.generatedAgreements.findIndex((a) => a.id === id);
        if (idx < 0) throw new FeaStorageError(`Agreement ${id} not found`);
        const current = draft.generatedAgreements[idx];
        assertCanMutateGeneratedContent(current);
        updated = { ...current, ...patch };
        draft.generatedAgreements[idx] = updated;
      });
      return structuredClone(updated!);
    },
    transitionGeneratedAgreementStatus: (id, nextStatus, opts) => {
      let updated: FeaGeneratedAgreement | null = null;
      apply((draft) => {
        const idx = draft.generatedAgreements.findIndex((a) => a.id === id);
        if (idx < 0) throw new FeaStorageError(`Agreement ${id} not found`);
        const current = draft.generatedAgreements[idx];
        assertValidStatusTransition(current.status, nextStatus);
        updated = {
          ...current,
          status: nextStatus,
          issuedAt:
            nextStatus === "ISSUED"
              ? opts?.issuedAt ?? new Date().toISOString().slice(0, 10)
              : current.issuedAt,
        };
        draft.generatedAgreements[idx] = updated;
      });
      return structuredClone(updated!);
    },
  };
}
