import { NextResponse } from "next/server";
import { verifySubmissionSignature } from "@/lib/aml-signature";
import { getSubmission, saveSubmission, SubmissionRecord } from "@/lib/submission-store";
import { createCompanyClient, createIndividualClient } from "@/lib/firmcheck";
import { sendInternalEmail } from "@/lib/notifications";
import { escapeHtml } from "@/lib/email-html";
import { isPreview } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Starting a Firmcheck check costs money, so the email link opens a
 * confirmation page (GET) and only the button on that page (POST) starts it.
 * This stops email link scanners from starting checks by "clicking" links.
 */

function page(title: string, body: string, status = 200): NextResponse {
    return new NextResponse(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title></head>
        <body style="margin:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1917;">
        <main style="max-width:520px;margin:64px auto;padding:32px;background:#fff;border:1px solid #e7e5e4;border-radius:16px;">
        <p style="font-weight:700;font-size:20px;margin:0 0 24px;">figures</p>
        <h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(title)}</h1>
        ${body}
        </main></body></html>`,
        { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
    );
}

function describe(record: SubmissionRecord): string {
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

async function load(submissionId: string, sig: string): Promise<SubmissionRecord | NextResponse> {
    if (!submissionId || !sig || !verifySubmissionSignature(submissionId, sig)) {
        return page("Link not valid", "<p>This link is invalid or has expired.</p>", 403);
    }
    const submission = await getSubmission(submissionId);
    if (!submission) return page("Not found", "<p>We could not find this submission.</p>", 404);
    if (submission.status === "completed" || submission.status === "initiated") {
        return page("Already started", `<p>The AML check for this submission is already ${submission.status}.</p><p>${describe(submission)}</p>`);
    }
    return submission;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get("submissionId") || "";
    const sig = searchParams.get("sig") || "";
    const result = await load(submissionId, sig);
    if (result instanceof NextResponse) return result;

    return page(
        "Start a Firmcheck AML check?",
        `<p style="line-height:1.5;">${describe(result)}</p>
         <p style="line-height:1.5;color:#57534e;">This creates the client in Firmcheck as a prospect. Firmcheck charges for checks.</p>
         <form method="post" style="margin-top:24px;">
            <input type="hidden" name="submissionId" value="${escapeHtml(submissionId)}">
            <input type="hidden" name="sig" value="${escapeHtml(sig)}">
            <button type="submit" style="padding:12px 20px;background:#ea580c;color:#fff;border:0;border-radius:8px;font-size:15px;cursor:pointer;">Start AML check</button>
         </form>`
    );
}

export async function POST(request: Request) {
    const form = await request.formData().catch(() => null);
    const submissionId = String(form?.get("submissionId") || "");
    const sig = String(form?.get("sig") || "");

    if (isPreview()) {
        return page("Not available on previews", "<p>Paid AML checks are switched off on preview builds.</p>", 403);
    }

    const result = await load(submissionId, sig);
    if (result instanceof NextResponse) return result;
    const submission = result;

    try {
        const updated = await runFirmcheckInitiation(submission);
        await saveSubmission(updated);

        if (!updated.notifications?.initiatedEmailSent) {
            const clientCount = updated.firmcheck?.clientIds.length || 0;
            await sendInternalEmail(
                `Firmcheck AML initiated: ${submissionId}`,
                `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2>Firmcheck AML initiated</h2>
                <p>${clientCount} client(s) created as prospects on Firmcheck.</p>
                <p>${describe(updated)}</p>
                <p><strong>Client IDs:</strong> ${escapeHtml(updated.firmcheck?.clientIds.join(", ") || "N/A")}</p>
                <p>Open Firmcheck to review the clients and start ID verification when ready.</p>
                <p><a href="https://my.firmcheck.com" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;">Open Firmcheck</a></p>
                </div>`
            );
            updated.notifications = { ...(updated.notifications || {}), initiatedEmailSent: true };
            await saveSubmission(updated);
        }

        return page(
            "AML check started",
            `<p>${describe(updated)}</p><p>${updated.firmcheck?.clientIds.length || 0} client(s) created in Firmcheck.</p>
             <p><a href="https://my.firmcheck.com" style="color:#c2410c;">Open Firmcheck</a></p>`
        );
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
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#dc2626;">Firmcheck AML failed</h2>
            <p>Firmcheck initiation failed and manual action is required.</p>
            <p>${describe(submission)}</p>
            <p><strong>Error:</strong> ${escapeHtml((error as Error).message)}</p>
            </div>`
        );

        return page("Something went wrong", "<p>Firmcheck could not start the check. We have emailed you the details.</p>", 500);
    }
}
