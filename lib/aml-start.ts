import { escapeHtml } from "@/lib/email-html";
import { createCompanyClient, createIndividualClient } from "@/lib/firmcheck";
import { sendInternalEmail } from "@/lib/notifications";
import { saveSubmission, type SubmissionRecord } from "@/lib/submission-store";

/**
 * Starting a Firmcheck AML check. Used by the button in the onboarding email
 * and, when switched on in Settings, automatically for clients who came
 * through a New client link.
 */

export function describeSubmission(record: SubmissionRecord): string {
    const p = record.payload;
    if (record.kind === "incorporation") {
        const step2 = (p.step2 ?? {}) as { name?: string; ending?: string };
        const people = (record.amlPeople || []).map((person) => escapeHtml(person.fullName)).join(", ");
        return `New company: <strong>${escapeHtml(`${step2.name || ""} ${step2.ending || ""}`.trim())}</strong><br/>People to check: ${people || "none listed"}`;
    }
    const who = [p.companyName, p.fullNamePassport].filter(Boolean).map((v) => escapeHtml(String(v))).join(" / ");
    return `Onboarding (${escapeHtml(String(p.onboardingType || ""))}): <strong>${who}</strong>`;
}

async function runFirmcheckInitiation(record: SubmissionRecord): Promise<SubmissionRecord> {
    const payload = record.payload;
    const clientIds = new Set<string>(record.firmcheck?.clientIds || []);

    if (record.kind === "incorporation") {
        // No company number yet, so check each director as an individual.
        for (const person of record.amlPeople || []) {
            if (!person.fullName) continue;
            const individual = await createIndividualClient({
                fullName: person.fullName,
                email: person.email,
                dob: person.dob,
                residentialAddress: person.address,
            });
            clientIds.add(individual.clientId);
        }
    } else {
        const onboardingType = String(payload.onboardingType || "");
        const email = typeof payload.email === "string" ? payload.email : undefined;

        // Company: Firmcheck pulls directors and PSCs from Companies House itself.
        if (onboardingType === "business" || onboardingType === "both") {
            const crn = typeof payload.registrationNumber === "string" ? payload.registrationNumber : "";
            if (!crn) throw new Error("Missing company registration number for company onboarding");
            const company = await createCompanyClient(crn);
            clientIds.add(company.clientId);
        }

        // Individual: the person filing a tax return.
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


/** Starts the check and emails the team either way. Never throws. */
export async function startAmlCheck(submission: SubmissionRecord): Promise<{ ok: boolean; record: SubmissionRecord }> {
    try {
        const updated = await runFirmcheckInitiation(submission);
        await saveSubmission(updated);
        if (!updated.notifications?.initiatedEmailSent) {
            const clientCount = updated.firmcheck?.clientIds.length || 0;
            await sendInternalEmail(
                `Firmcheck AML initiated: ${submission.id}`,
                `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2>Firmcheck AML initiated</h2>
                <p>${clientCount} client(s) created as prospects on Firmcheck.</p>
                <p>${describeSubmission(updated)}</p>
                <p><strong>Client IDs:</strong> ${escapeHtml(updated.firmcheck?.clientIds.join(", ") || "N/A")}</p>
                <p>Open Firmcheck to review the clients and start ID verification when ready.</p>
                <p><a href="https://my.firmcheck.com" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;">Open Firmcheck</a></p>
                </div>`
            );
            updated.notifications = { ...(updated.notifications || {}), initiatedEmailSent: true };
            await saveSubmission(updated);
        }
        return { ok: true, record: updated };
    } catch (error) {
        const failed: SubmissionRecord = {
            ...submission,
            updatedAt: new Date().toISOString(),
            status: "failed",
            error: (error as Error).message,
            notifications: { ...(submission.notifications || {}), failureEmailSent: true },
        };
        await saveSubmission(failed).catch(() => {});
        await sendInternalEmail(
            `Firmcheck AML failed: ${submission.id}`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#dc2626;">Firmcheck AML failed</h2>
            <p>Firmcheck initiation failed and manual action is required.</p>
            <p>${describeSubmission(submission)}</p>
            <p><strong>Error:</strong> ${escapeHtml((error as Error).message)}</p>
            </div>`
        );
        return { ok: false, record: failed };
    }
}
