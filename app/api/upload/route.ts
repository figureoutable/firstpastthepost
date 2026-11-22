import crypto from "crypto";
import { NextResponse } from "next/server";
import { putFile } from "@/lib/private-blob";
import { getDraft } from "@/lib/onboarding-draft-store";
import { DOCUMENT_PREFIX } from "@/lib/document-links";

/** Vercel limits request bodies to 4.5 MB; the browser shrinks large photos first. */
const MAX_BYTES = 4 * 1024 * 1024;
const KINDS = new Set(["photoId", "proofOfAddress"]);

type Detected = { ext: string; contentType: string };

/** Check the file's first bytes so only real PDFs and photos are stored. */
function detectType(bytes: Buffer): Detected | null {
    if (bytes.subarray(0, 4).toString("latin1") === "%PDF") return { ext: "pdf", contentType: "application/pdf" };
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
    if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return { ext: "png", contentType: "image/png" };
    }
    if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") {
        return { ext: "webp", contentType: "image/webp" };
    }
    if (bytes.subarray(4, 8).toString("latin1") === "ftyp") {
        const brand = bytes.subarray(8, 12).toString("latin1");
        if (["heic", "heix", "hevc", "mif1", "msf1", "heif"].includes(brand)) {
            return { ext: "heic", contentType: "image/heic" };
        }
    }
    return null;
}

export async function GET() {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: Request): Promise<NextResponse> {
    const { searchParams } = new URL(request.url);
    const code = request.headers.get("x-resume-code") || "";
    const kind = searchParams.get("kind") || "";

    if (!KINDS.has(kind)) {
        return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
    }

    // Only people with an onboarding session in progress can upload.
    const draft = await getDraft(code);
    if (!draft) {
        return NextResponse.json(
            { error: "Your session has expired. Please refresh the page and try again." },
            { status: 403 }
        );
    }

    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) {
        return NextResponse.json({ error: "That file is too large. Please upload a file under 4 MB." }, { status: 413 });
    }

    try {
        const bytes = Buffer.from(await request.arrayBuffer());
        if (bytes.length === 0) {
            return NextResponse.json({ error: "The file was empty. Please try again." }, { status: 400 });
        }
        if (bytes.length > MAX_BYTES) {
            return NextResponse.json({ error: "That file is too large. Please upload a file under 4 MB." }, { status: 413 });
        }
        const detected = detectType(bytes);
        if (!detected) {
            return NextResponse.json(
                { error: "Please upload a PDF or a photo (JPG, PNG, HEIC or WEBP)." },
                { status: 415 }
            );
        }

        const pathname = `${DOCUMENT_PREFIX}${draft.code}/${kind}-${crypto.randomUUID()}.${detected.ext}`;
        const stored = await putFile(pathname, bytes, { contentType: detected.contentType });
        return NextResponse.json({ pathname: stored.pathname });
    } catch (error) {
        console.error("[upload] Failed", error);
        return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }
}
