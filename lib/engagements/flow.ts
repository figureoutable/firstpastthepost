import type { Engagement, FlowStep } from "./types";

/**
 * Where the client is in the flow. Every client-facing API checks this before
 * doing anything, so steps can never be skipped (not even by editing the URL).
 */
export function currentStep(e: Engagement): FlowStep {
  if (e.status === "cancelled") return "cancelled";
  if (!e.signature) return "letter";
  if (paymentRequired(e) && !e.payment.completedAt) return "payment";
  if (!e.onboarding?.completedAt) return "onboarding";
  return "done";
}

export function paymentRequired(e: Engagement): boolean {
  return e.payment.method !== "none";
}

/** Steps the client sees, in order. "No payment step" clients simply never see the payment step. */
export function visibleSteps(e: Engagement): { id: FlowStep; label: string }[] {
  const steps: { id: FlowStep; label: string }[] = [{ id: "letter", label: "Engagement letter" }];
  if (paymentRequired(e)) {
    steps.push({ id: "payment", label: e.payment.method === "card" ? "Payment" : "Direct Debit" });
  }
  steps.push({ id: "onboarding", label: "Your details" });
  return steps;
}

export type StageState = "done" | "current" | "waiting" | "skipped" | "problem";

export interface AmlView {
  state: "not_started" | "in_progress" | "passed" | "flagged";
  label: string;
}

/** Plain summary for the status board. */
export function stageSummary(e: Engagement, aml?: AmlView) {
  const step = currentStep(e);
  const paymentState: StageState = !paymentRequired(e)
    ? "skipped"
    : ["failed", "cancelled"].includes(e.payment.status)
      ? "problem"
      : e.payment.completedAt
        ? "done"
        : step === "payment"
          ? "current"
          : "waiting";

  const paymentLabel = !paymentRequired(e)
    ? "Not needed"
    : e.payment.status === "active"
      ? "Direct Debit active"
      : e.payment.status === "submitted"
        ? "Set up, bank confirming"
        : e.payment.status === "paid"
          ? "Paid by card"
          : e.payment.status === "failed"
            ? "Failed"
            : e.payment.status === "cancelled"
              ? "Cancelled by client"
              : e.payment.status === "pending"
                ? "Started"
                : "Not started";

  return {
    step,
    link: { state: (e.firstOpenedAt ? "done" : e.linkSentAt ? "current" : "waiting") as StageState, label: e.firstOpenedAt ? "Opened" : e.linkSentAt ? "Sent" : "Not sent" },
    letter: { state: (e.signature ? "done" : step === "letter" ? "current" : "waiting") as StageState, label: e.signature ? "Signed" : "Not signed" },
    payment: { state: paymentState, label: paymentLabel },
    onboarding: {
      state: (e.onboarding?.completedAt ? "done" : step === "onboarding" ? "current" : "waiting") as StageState,
      label: e.onboarding?.completedAt ? "Done" : e.onboarding?.draftCode ? "Started" : "Not started",
    },
    aml: aml || { state: "not_started", label: "Not started" },
  };
}
