import { NextResponse } from "next/server";
import { verifySubmissionSignature } from "@/lib/aml-signature";
import { getSubmission, saveSubmission, SubmissionRecord } from "@/lib/submission-store";
import { createCompanyClient, createIndividualClient, triggerVerification } from "@/lib/firmcheck";
import { sendInternalEmail } from "@/lib/notifications";

function normalize(value: unknown): string {
    if (typeof value !== "string") return "";
    return value.trim().toLowerCase();
}

function dedupeKey(person: { fullName?: string; email?: string; dob?: string; address?: string }): string {
    return [
        normalize(person.fullName),
        normalize(person.email),
        normalize(person.dob),
        normalize(person.address),
    ].join("|");
}

async function runFirmcheckInitiation(record: SubmissionRecord): Promise<SubmissionRecord> {
    const payload = record.payload;
    const onboardingType = String(payload.onboardingType || "");
    const email = typeof payload.email === "string" ? payload.email : undefined;
    const clientIds = new Set<string>(record.firmcheck?.clientIds || []);
    const verificationIds = new Set<string>(record.firmcheck?.verificationIds || []);
    const seenIndividuals = new Map<string, string>();

    // Company client creation for business and combined submissions.
    if (onboardingType === "business" || onboardingType === "both") {
        const crn = typeof payload.registrationNumber === "string" ? payload.registrationNumber : "";
        if (!crn) {
            throw new Error("Missing company registration number for company onboarding");
        }
        const companyName = typeof payload.companyName === "string" ? payload.companyName : undefined;
        const company = await createCompanyClient(crn, companyName);
        clientIds.add(company.clientId);
    }

    const maybeCreateIndividual = async (person: {
        fullName?: string;
        email?: string;
        dob?: string;
        address?: string;
    }) => {
        const key = dedupeKey(person);
        if (!key || key === "|||") return;

        let clientId = seenIndividuals.get(key);
        if (!clientId) {
            const created = await createIndividualClient({
                fullName: person.fullName || "Unknown",
                email: person.email || email,
                dob: person.dob,
                residentialAddress: person.address,
            });
            clientId = created.clientId;
            seenIndividuals.set(key, clientId);
            clientIds.add(clientId);
        }

        const verification = await triggerVerification(clientId);
        verificationIds.add(verification.verificationId);
    };

    // Individual tax client creation.
    if (onboardingType === "self-assessment" || onboardingType === "both") {
        await maybeCreateIndividual({
            fullName: typeof payload.fullNamePassport === "string" ? payload.fullNamePassport : undefined,
            email,
            // Some workflows do not currently collect DOB. API call still runs with available fields.
            dob: typeof payload.dob === "string" ? payload.dob : undefined,
            address: typeof payload.homeAddress === "string" ? payload.homeAddress : typeof payload.tradingAddress === "string" ? payload.tradingAddress : undefined,
        });
    }

    // Directors / PSC candidates from form data.
    const directors = Array.isArray(payload.directors) ? payload.directors : [];
    for (const director of directors) {
        if (!director || typeof director !== "object") continue;
        const person = director as Record<string, unknown>;
        await maybeCreateIndividual({
            fullName: `${String(person.firstName || "")} ${String(person.lastName || "")}`.trim(),
            email,
            dob: typeof person.dob === "string" ? person.dob : undefined,
            address: typeof person.address === "string" ? person.address : undefined,
        });
    }

    const updated: SubmissionRecord = {
        ...record,
        updatedAt: new Date().toISOString(),
        status: "initiated",
        firmcheck: {
            clientIds: [...clientIds],
            verificationIds: [...verificationIds],
            lastPolledAt: record.firmcheck?.lastPolledAt,
            amlStatus: record.firmcheck?.amlStatus,
            riskLevel: record.firmcheck?.riskLevel,
        },
    };

    return updated;
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
            await sendInternalEmail(
                `Firmcheck AML initiated: ${submissionId}`,
                `<p>Firmcheck AML has been initiated.</p>
                <p><strong>Submission ID:</strong> ${submissionId}</p>
                <p><strong>Client IDs:</strong> ${updated.firmcheck?.clientIds.join(", ") || "N/A"}</p>
                <p><strong>Verification IDs:</strong> ${updated.firmcheck?.verificationIds.join(", ") || "N/A"}</p>`
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
            `<p>Firmcheck initiation failed and manual action is required.</p>
            <p><strong>Submission ID:</strong> ${submissionId}</p>
            <p><strong>Error:</strong> ${(error as Error).message}</p>`
        );

        return NextResponse.json(
            { message: "Firmcheck initiation failed. A failure email has been sent.", submissionId },
            { status: 500 }
        );
    }
}
