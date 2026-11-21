import { NextResponse } from "next/server";
import { verifyDocumentLink } from "@/lib/document-links";
import { readFile } from "@/lib/private-blob";

export const dynamic = "force-dynamic";

/** Opens a client document from a signed link in an internal email or the sheet. */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "";
    const exp = searchParams.get("exp") || "";
    const sig = searchParams.get("sig") || "";

    if (!verifyDocumentLink(path, exp, sig)) {
        return new NextResponse("This link is invalid or has expired.", { status: 403 });
    }

    const file = await readFile(path);
    if (!file) {
        return new NextResponse("File not found.", { status: 404 });
    }

    const filename = path.split("/").pop() || "document";
    return new NextResponse(file.stream, {
        headers: {
            "Content-Type": file.contentType || "application/octet-stream",
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
        },
    });
}
