import { NextResponse } from "next/server";
import { extractAmlStatus, getClient } from "@/lib/firmcheck";
import { sendInternalEmail } from "@/lib/notifications";
import { listSubmissions, saveSubmission } from "@/lib/submission-store";

export async function GET(request: Request) {
    const configuredSecret = process.env.CRON_SECRET;
    const providedSecret = request.headers.get("x-cron-secret") || "";
    const authHeader = request.headers.get("authorization") || "";
    const bearerSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (configuredSecret && providedSecret !== configuredSecret && bearerSecret !== configuredSecret) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const submissions = await listSubmissions();
    const pending = submissions.filter((s) => s.status === "initiated");

    let processed = 0;
    for (const submission of pending) {
        const clientIds = submission.firmcheck?.clientIds || [];
        if (!clientIds.length) continue;

        let allCompleted = true;
        let highestRisk = "Low";

        for (const clientId of clientIds) {
            try {
                const payload = await getClient(clientId);
                const { amlStatus, riskLevel } = extractAmlStatus(payload);
                if (!amlStatus || amlStatus.toLowerCase() !== "completed") {
                    allCompleted = false;
                }

                if (riskLevel && ["High", "Medium", "Low"].includes(riskLevel)) {
                    if (riskLevel === "High") highestRisk = "High";
                    if (riskLevel === "Medium" && highestRisk !== "High") highestRisk = "Medium";
                }
            } catch {
                allCompleted = false;
            }
        }

        submission.updatedAt = new Date().toISOString();
        submission.firmcheck = {
            ...(submission.firmcheck || { clientIds: [], verificationIds: [] }),
            lastPolledAt: new Date().toISOString(),
            amlStatus: allCompleted ? "Completed" : "In Progress",
            riskLevel: highestRisk,
        };

        if (allCompleted) {
            submission.status = "completed";
            if (!submission.notifications?.completionEmailSent) {
                await sendInternalEmail(
                    `Firmcheck AML completed: ${submission.id}`,
                    `<p>Firmcheck AML checks are completed.</p>
                    <p><strong>Submission ID:</strong> ${submission.id}</p>
                    <p><strong>AML Status:</strong> Completed</p>
                    <p><strong>Risk Level:</strong> ${highestRisk}</p>
                    <p>Please review details in the Firmcheck dashboard.</p>`
                );
                submission.notifications = {
                    ...(submission.notifications || {}),
                    completionEmailSent: true,
                };
            }
        }

        await saveSubmission(submission);
        processed += 1;
    }

    return NextResponse.json({
        message: "Poll completed",
        processed,
        pendingCount: pending.length,
    });
}
