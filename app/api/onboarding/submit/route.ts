import { after, NextResponse } from "next/server";
import { createSubmission } from "@/lib/submission-store";
import { signSubmissionId } from "@/lib/aml-signature";
import { sendClientEmail, sendInternalEmail } from "@/lib/notifications";
import { appendOnboardingSubmission } from "@/lib/google-sheets";
import { escapeHtml } from "@/lib/email-html";
import { documentHref, LINK_LIFETIME_DAYS } from "@/lib/document-links";
import { deleteDraft, getDraft } from "@/lib/onboarding-draft-store";
import { appOrigin, isPreview, isProduction } from "@/lib/env";
import { startAmlCheck } from "@/lib/aml-start";
import { getSettings } from "@/lib/engagements/settings";
import {
    AML_QUESTIONS,
    FIELD_LABELS,
    HIDDEN_FIELDS,
    isEmail,
    isOnboardingType,
    type OnboardingType,
} from "@/lib/onboarding-fields";
import { nextStepsEmailHtml, onboardingNextSteps } from "@/lib/next-steps";
import { FIRM } from "@/lib/figures-config";
import { adminLink, checkOnboardingAllowed, completeOnboarding, FlowError } from "@/lib/engagements/actions";
import { getEngagementByToken } from "@/lib/engagements/store";
import { escapeHtml as esc } from "@/lib/email-html";

function label(key: string): string {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") {
        if (value === "yes") return "Yes";
        if (value === "no") return "No";
        return escapeHtml(value).replace(/\n/g, "<br/>");
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return "None";
        if (value.every((item) => typeof item === "string" || typeof item === "number")) {
            return escapeHtml(value.join(", "));
        }
        return value
            .map((item, index) => {
                if (!item || typeof item !== "object") return `<div>${escapeHtml(String(item))}</div>`;
                const lines = Object.entries(item as Record<string, unknown>)
                    .filter(([k]) => k !== "id")
                    .map(([k, v]) => `<div><strong>${escapeHtml(label(k))}:</strong> ${formatValue(v)}</div>`)
                    .join("");
                return `<div style="margin-bottom:10px;"><strong>Person ${index + 1}</strong>${lines}</div>`;
            })
            .join("");
    }
    return escapeHtml(JSON.stringify(value));
}

const ORDER = [
    "onboardingType",
    "fullNamePassport",
    "email",
    "phoneNumber",
    "dob",
    "homeAddress",
    "niNumber",
    "personalUtr",
    "companyName",
    "registrationNumber",
    "businessUtr",
    "companyAuthCode",
];

function renderRows(payload: Record<string, unknown>): string {
    const keys = Object.keys(payload).filter((k) => !HIDDEN_FIELDS.has(k));
    keys.sort((a, b) => {
        const ai = ORDER.indexOf(a);
        const bi = ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });
    return keys
        .map(
            (key) => `
        <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;font-weight:600;vertical-align:top;width:40%;">${escapeHtml(label(key))}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eee;vertical-align:top;">${formatValue(payload[key])}</td>
        </tr>`
        )
        .join("");
}

/** Returns a message for the first problem found, or null when the submission is complete. */
function validate(type: OnboardingType, body: Record<string, unknown>): string | null {
    const text = (key: string) => typeof body[key] === "string" && (body[key] as string).trim().length > 0;
    if (!text("fullNamePassport")) return "Please enter your full name.";
    if (!isEmail(body.email)) return "Please enter a valid email address.";
    if (!text("photoId") || !text("proofOfAddress")) return "Please upload your photo ID and proof of address.";
    if ((type === "business" || type === "both") && (!text("companyName") || !text("registrationNumber"))) {
        return "Please enter your company name and number.";
    }
    for (const q of AML_QUESTIONS[type]) {
        if (body[q.field] !== "yes" && body[q.field] !== "no") {
            return "Please answer every compliance question.";
        }
    }
    if (body.confirmed !== true) return "Please confirm your details are accurate.";
    return null;
}

export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ message: "Invalid request." }, { status: 400 });
    }

    // Hidden "website" field: people never see it, bots fill it in.
    if (typeof body.website === "string" && body.website.trim()) {
        return NextResponse.json({ message: "Received" }, { status: 200 });
    }

    const type = body.onboardingType;
    if (!isOnboardingType(type)) {
        return NextResponse.json({ message: "Missing onboarding type." }, { status: 400 });
    }
    const problem = validate(type, body);
    if (problem) {
        return NextResponse.json({ message: problem }, { status: 400 });
    }

    const resumeCode = typeof body.resumeCode === "string" ? body.resumeCode : "";
    const payload: Record<string, unknown> = { ...body };
    delete payload.resumeCode;
    delete payload.website;
    delete payload.engagementToken;

    // Clients coming through a New client link must have signed and paid first.
    const engagementToken = typeof body.engagementToken === "string" ? body.engagementToken : "";
    const engagement = engagementToken ? await getEngagementByToken(engagementToken) : null;
    if (engagementToken) {
        if (!engagement) return NextResponse.json({ message: "This link is not valid. Please contact us." }, { status: 404 });
        try {
            checkOnboardingAllowed(engagement);
        } catch (error) {
            const message = error instanceof FlowError ? error.message : "Please refresh the page.";
            return NextResponse.json({ message }, { status: error instanceof FlowError ? error.status : 409 });
        }
        if (engagement.client.type !== type) {
            return NextResponse.json({ message: "Please refresh the page and try again." }, { status: 409 });
        }
        payload.engagementId = engagement.id;
    } else if (!(await getSettings()).oldOnboardingForm && (!resumeCode || !(await getDraft(resumeCode)))) {
        // The old public form is switched off in Settings. Forms started before that can still be sent.
        return NextResponse.json(
            { message: "New clients now get a personal link from us. Please book a free call and we'll send yours." },
            { status: 410 }
        );
    }

    try {
        const submission = await createSubmission(payload, { kind: "onboarding" });

        await appendOnboardingSubmission(submission.id, payload, request);

        const photoLink = documentHref(payload.photoId, request);
        const addressLink = documentHref(payload.proofOfAddress, request);
        const button = (href: string, text: string) =>
            href
                ? `<a href="${href}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;background:#1c1917;color:#fff;text-decoration:none;border-radius:8px;">${text}</a>`
                : "";

        // Link clients have signed and set up payment, so the team can choose to start AML straight away.
        const autoAml = Boolean(engagement) && isProduction() && (await getSettings()).autoStartAml;
        const amlSection = autoAml
            ? `<p>The Firmcheck AML check is starting automatically (switched on in Settings). You'll get an email when it has started.</p>`
            : isPreview()
            ? `<p style="color:#9a3412;">This is a test submission from a preview build, so the paid Firmcheck AML button is hidden.</p>`
            : `<p>After reviewing this submission, use the button below to start the paid Firmcheck AML check. You will be asked to confirm first.</p>
               <a href="${appOrigin(request)}/api/firmcheck/initiate?submissionId=${encodeURIComponent(submission.id)}&sig=${signSubmissionId(submission.id)}" style="display:inline-block;padding:10px 16px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;">Review and start AML check</a>`;

        const who = String(payload.companyName || payload.fullNamePassport || "client");
        try {
            await sendInternalEmail(
                `New onboarding: ${who}`,
                `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:720px;margin:0 auto;padding:20px;">
                    <h2 style="margin:0 0 4px;">New onboarding submission</h2>
                    <p style="color:#57534e;margin:0 0 16px;">${escapeHtml(type)} onboarding. Submission ID ${submission.id}</p>
                    ${engagement ? `<p style="margin:0 0 16px;">Came through a New client link. Engagement letter signed${engagement.payment.method === "none" ? "" : " and payment set up"}. <a href="${esc(adminLink(engagement, request))}" style="color:#c2410c;">Open on the status board</a></p>` : ""}
                    <table style="width:100%;border-collapse:collapse;font-size:14px;">${renderRows(payload)}</table>
                    <h3 style="margin-top:28px;">Documents</h3>
                    <div>${button(photoLink, "View photo ID")}${button(addressLink, "View proof of address")}</div>
                    <p style="color:#78716c;font-size:12px;">Document links work for ${LINK_LIFETIME_DAYS} days. Save the documents to the client file when you review them.</p>
                    <h3 style="margin-top:28px;">Firmcheck AML</h3>
                    ${amlSection}
                </div>`
            );
        } catch (error) {
            // The submission is saved; don't make the client submit twice.
            console.error("[onboarding] Internal email failed", error);
        }

        if (typeof payload.email === "string") {
            const firstName = String(payload.fullNamePassport || "").trim().split(/\s+/)[0] || "there";
            await sendClientEmail(
                payload.email,
                "We've received your details",
                nextStepsEmailHtml(
                    `Hi ${escapeHtml(firstName)}, thank you for sending your details to Figures. Here is what happens next.`,
                    onboardingNextSteps({ hasPreviousAccountant: payload.previousAccountant === "yes", letterSigned: Boolean(engagement) }),
                    FIRM.contactEmail
                )
            );
        }

        if (resumeCode) {
            await deleteDraft(resumeCode).catch((error) => console.error("[onboarding] Draft cleanup failed", error));
        }
        if (engagement) {
            await completeOnboarding(engagement.id, submission.id).catch((error) =>
                console.error("[onboarding] Could not update the client record", error)
            );
        }
        if (autoAml) {
            // After the client has their answer, so they aren't kept waiting.
            after(() => startAmlCheck(submission).then(() => undefined));
        }

        return NextResponse.json({ message: "Received", submissionId: submission.id }, { status: 200 });
    } catch (error) {
        console.error("[onboarding] Submission failed", error);
        return NextResponse.json(
            { message: "We could not save your details. Please try again in a moment." },
            { status: 500 }
        );
    }
}
