import { NextResponse } from "next/server";
import { withMember } from "@/lib/admin/api";
import { FlowError, saveLetterToDrive, sendLink } from "@/lib/engagements/actions";
import { getEngagement, logEvent, saveEngagement } from "@/lib/engagements/store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withMember(async (member) => {
    const { id } = await params;
    const e = await getEngagement(id);
    if (!e) throw new FlowError("Client not found.", 404);
    const body = await request.json().catch(() => ({}));

    switch (body?.action) {
      case "resend": {
        const sent = await sendLink(e, member.email, request);
        if (!sent) throw new FlowError("The email could not be sent. Copy the link and send it another way.", 502);
        return NextResponse.json({ ok: true });
      }
      case "cancel": {
        if (e.status === "complete") throw new FlowError("This client has already finished.");
        e.status = "cancelled";
        logEvent(e, member.email, "Cancelled the link");
        await saveEngagement(e);
        return NextResponse.json({ ok: true });
      }
      case "retry-drive": {
        const ok = await saveLetterToDrive(e);
        if (!ok) throw new FlowError(e.signature?.drive?.error ? `Google Drive: ${e.signature.drive.error}` : "Google Drive is not connected yet.", 502);
        return NextResponse.json({ ok: true });
      }
      case "resolve-flag": {
        const flag = e.flags.find((f) => f.id === body.flagId);
        if (!flag) throw new FlowError("Flag not found.", 404);
        flag.resolvedAt = new Date().toISOString();
        flag.resolvedBy = member.email;
        logEvent(e, member.email, `Marked as dealt with: ${flag.message}`);
        await saveEngagement(e);
        return NextResponse.json({ ok: true });
      }
      default:
        throw new FlowError("Unknown action.");
    }
  });
}
