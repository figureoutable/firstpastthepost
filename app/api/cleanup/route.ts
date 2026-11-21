import { NextResponse } from "next/server";
import { deleteFiles, listFiles } from "@/lib/private-blob";
import { ONBOARDING_DRAFT_PREFIX } from "@/lib/onboarding-draft-store";
import { INCORPORATION_DRAFT_PREFIX } from "@/lib/incorporation-draft-store";

export const dynamic = "force-dynamic";

/**
 * Daily job (see vercel.json): deletes unfinished drafts and documents from
 * sessions that were never submitted, after DRAFT_DAYS.
 *
 * Submitted records and their documents are kept: the Money Laundering
 * Regulations require client due diligence records to be kept for five years
 * after the client relationship ends.
 */
const DRAFT_DAYS = 30;

function authorised(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const auth = request.headers.get("authorization") || "";
    return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
    if (!authorised(request)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const cutoff = Date.now() - DRAFT_DAYS * 24 * 60 * 60 * 1000;
    const drafts = [
        ...(await listFiles(ONBOARDING_DRAFT_PREFIX)),
        ...(await listFiles(INCORPORATION_DRAFT_PREFIX)),
    ];
    const stale = drafts.filter((file) => file.uploadedAt.getTime() < cutoff).map((file) => file.pathname);

    // Documents live under documents/<resume code>/. A document whose session
    // was abandoned (no draft and never submitted) is older than the cutoff and
    // its code no longer has a draft.
    const liveCodes = new Set(
        drafts
            .filter((file) => file.uploadedAt.getTime() >= cutoff)
            .map((file) => file.pathname.split("/").pop()?.replace(".json", ""))
    );
    const submittedDocs = new Set<string>();
    const { listSubmissions } = await import("@/lib/submission-store");
    for (const submission of await listSubmissions()) {
        for (const key of ["photoId", "proofOfAddress"]) {
            const value = submission.payload[key];
            if (typeof value === "string") submittedDocs.add(value);
        }
    }
    const documents = await listFiles("documents/");
    const staleDocs = documents
        .filter((file) => file.uploadedAt.getTime() < cutoff)
        .filter((file) => !submittedDocs.has(file.pathname))
        .filter((file) => !liveCodes.has(file.pathname.split("/")[1]))
        .map((file) => file.pathname);

    const toDelete = [...stale, ...staleDocs];
    for (let i = 0; i < toDelete.length; i += 100) {
        await deleteFiles(toDelete.slice(i, i + 100));
    }

    return NextResponse.json({ deletedDrafts: stale.length, deletedDocuments: staleDocs.length });
}
