import { NextResponse } from "next/server";
import { verifySubmissionSignature } from "@/lib/aml-signature";
import { getSubmission, SubmissionRecord } from "@/lib/submission-store";
import { describeSubmission, startAmlCheck } from "@/lib/aml-start";
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

async function load(submissionId: string, sig: string): Promise<SubmissionRecord | NextResponse> {
    if (!submissionId || !sig || !verifySubmissionSignature(submissionId, sig)) {
        return page("Link not valid", "<p>This link is invalid or has expired.</p>", 403);
    }
    const submission = await getSubmission(submissionId);
    if (!submission) return page("Not found", "<p>We could not find this submission.</p>", 404);
    if (submission.status === "completed" || submission.status === "initiated") {
        return page("Already started", `<p>The AML check for this submission is already ${submission.status}.</p><p>${describeSubmission(submission)}</p>`);
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
        `<p style="line-height:1.5;">${describeSubmission(result)}</p>
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

    const { ok, record } = await startAmlCheck(submission);
    if (!ok) {
        return page("Something went wrong", "<p>Firmcheck could not start the check. We have emailed you the details.</p>", 500);
    }
    return page(
        "AML check started",
        `<p>${describeSubmission(record)}</p><p>${record.firmcheck?.clientIds.length || 0} client(s) created in Firmcheck.</p>
         <p><a href="https://my.firmcheck.com" style="color:#c2410c;">Open Firmcheck</a></p>`
    );
}
