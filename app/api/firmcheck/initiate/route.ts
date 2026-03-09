import { NextResponse } from "next/server";
import { verifySubmissionSignature } from "@/lib/aml-signature";
import { getSubmission, saveSubmission, SubmissionRecord } from "@/lib/submission-store";
import { createCompanyClient, createIndividualClient } from "@/lib/firmcheck";
import { sendInternalEmail } from "@/lib/notifications";

async function runFirmcheckInitiation(record: SubmissionRecord): Promise<SubmissionRecord> {
    const payload = record.payload;
    const onboardingType = String(payload.onboardingType || "");
    const email = typeof payload.email === "string" ? payload.email : undefined;
    const clientIds = new Set<string>(record.firmcheck?.clientIds || []);

    // Company: use CRN to create client. Firmcheck auto-pulls directors/PSCs
    // from Companies House as related parties — no need to create them separately.
    if (onboardingType === "business" || onboardingType === "both") {
        const crn = typeof payload.registrationNumber === "string" ? payload.registrationNumber : "";
        if (!crn) {
            throw new Error("Missing company registration number for company onboarding");
        }
        const company = await createCompanyClient(crn);
        clientIds.add(company.clientId);
    }

    // Individual: create for self-assessment (the person filing taxes).
    // For "both", this is the individual alongside the company.
    if (onboardingType === "self-assessment" || onboardingType === "both") {
        const fullName = typeof payload.fullNamePassport === "string" ? payload.fullNamePassport : undefined;
        if (fullName) {
            const individual = await createIndividualClient({
                fullName,
                email,
                dob: typeof payload.dob === "string" ? payload.dob : undefined,
                residentialAddress: typeof payload.homeAddress === "string" ? payload.homeAddress : undefined,
            });
            clientIds.add(individual.clientId);
        }
    }

    return {
        ...record,
        updatedAt: new Date().toISOString(),
        status: "initiated",
        firmcheck: {
            clientIds: [...clientIds],
            verificationIds: [],
            lastPolledAt: record.firmcheck?.lastPolledAt,
            amlStatus: record.firmcheck?.amlStatus,
            riskLevel: record.firmcheck?.riskLevel,
        },
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get("submissionId") || "";
    const sig = searchParams.get("sig") || "";

    if (!submissionId || !sig || !verifySubmissionSignature(submissionId, sig)) {
        return NextResponse.json({ message: "Invalid or expired initiation link." }, { status: 403 });
    }

    const submission = await getSubmission(submissionId);
    if (!submission) {
        return NextResponse.json({ message: "Submission not found." }, { status: 404 });
    }

    if (submission.status === "completed" || submission.status === "initiated") {
        return NextResponse.json({
            message: `AML flow already ${submission.status} for this submission.`,
            submissionId,
            status: submission.status,
        });
    }

    try {
        const updated = await runFirmcheckInitiation(submission);
        await saveSubmission(updated);

        if (!updated.notifications?.initiatedEmailSent) {
            const clientCount = updated.firmcheck?.clientIds.length || 0;
            await sendInternalEmail(
                `Firmcheck AML initiated: ${submissionId}`,
                `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #111;">Firmcheck AML Initiated</h2>
                <p>${clientCount} client(s) created as prospects on Firmcheck.</p>
                <p><strong>Submission ID:</strong> ${submissionId}</p>
                <p><strong>Client IDs:</strong> ${updated.firmcheck?.clientIds.join(", ") || "N/A"}</p>
                <p>Open Firmcheck to review the clients and start ID verification when ready.</p>
                <p style="margin-top: 20px;"><a href="https://my.firmcheck.com" style="display:inline-block; background:#111; color:#fff; text-decoration:none; padding:10px 16px; border-radius:8px;">Open Firmcheck Dashboard</a></p>
                </div>`
            );
            updated.notifications = { ...(updated.notifications || {}), initiatedEmailSent: true };
            await saveSubmission(updated);
        }

        return NextResponse.json({
            message: "Firmcheck AML initiated successfully.",
            submissionId,
            status: updated.status,
            clientIds: updated.firmcheck?.clientIds || [],
        });
    } catch (error) {
        const failed: SubmissionRecord = {
            ...submission,
            updatedAt: new Date().toISOString(),
            status: "failed",
            error: (error as Error).message,
            notifications: { ...(submission.notifications || {}), failureEmailSent: true },
        };
        await saveSubmission(failed);

        await sendInternalEmail(
            `Firmcheck AML failed: ${submissionId}`,
            `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #dc2626;">Firmcheck AML Failed</h2>
            <p>Firmcheck initiation failed and manual action is required.</p>
            <p><strong>Submission ID:</strong> ${submissionId}</p>
            <p><strong>Error:</strong> ${(error as Error).message}</p>
            <p style="margin-top: 20px;"><a href="https://my.firmcheck.com" style="display:inline-block; background:#111; color:#fff; text-decoration:none; padding:10px 16px; border-radius:8px;">Open Firmcheck Dashboard</a></p>
            </div>`
        );

        return NextResponse.json(
            { message: "Firmcheck initiation failed. A failure email has been sent.", submissionId },
            { status: 500 }
        );
    }
}
