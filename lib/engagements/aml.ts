import { getSubmission, type SubmissionRecord } from "@/lib/submission-store";
import type { AmlView } from "./flow";
import type { Engagement } from "./types";

/**
 * AML status for the status board, read from the onboarding submission.
 * The Firmcheck check itself is still started by the team from the email,
 * exactly as before.
 */
export function amlView(submission: SubmissionRecord | null): AmlView {
  if (!submission) return { state: "not_started", label: "Not started" };
  const status = submission.firmcheck?.amlStatus || "";
  const risk = submission.firmcheck?.riskLevel || "";
  if (submission.status === "failed") return { state: "flagged", label: "Check failed to start" };
  if (/fail|reject|refer|decline/i.test(status)) return { state: "flagged", label: `Failed (${status})` };
  if (submission.status === "completed") {
    if (risk === "High") return { state: "flagged", label: "High risk: review" };
    return { state: "passed", label: risk ? `Passed (${risk} risk)` : "Passed" };
  }
  if (submission.status === "initiated") return { state: "in_progress", label: "In progress" };
  return { state: "not_started", label: "Ready for you to start" };
}

export async function amlFor(e: Engagement): Promise<AmlView> {
  const id = e.onboarding?.submissionId;
  if (!id) return { state: "not_started", label: "Not started" };
  return amlView(await getSubmission(id).catch(() => null));
}
