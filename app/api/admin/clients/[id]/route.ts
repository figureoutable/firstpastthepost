import { NextResponse } from "next/server";
import { withMember } from "@/lib/admin/api";
import { clientLink, editClient, FlowError, saveLetterToDrive, sendLink, type NewClientInput } from "@/lib/engagements/actions";
import { getEngagement, logEvent, updateEngagement } from "@/lib/engagements/store";

export const maxDuration = 120;

/** Edit before the client signs. Same link, new letter. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withMember(async (member) => {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as NewClientInput;
    const { engagement, sent } = await editClient(id, body, member.email, request);
    return NextResponse.json({ id: engagement.id, link: clientLink(engagement, request), sent });
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withMember(async (member) => {
    const { id } = await params;
    const e = await getEngagement(id);
    if (!e) throw new FlowError("Client not found.", 404);
    const body = await request.json().catch(() => ({}));

    switch (body?.action) {
      case "resend": {
        const sent = await sendLink(id, member.email, request);
        if (!sent) throw new FlowError("The email could not be sent. Copy the link and send it another way.", 502);
        return NextResponse.json({ ok: true });
      }
      case "cancel": {
        await updateEngagement(id, (fresh) => {
          if (fresh.status === "complete") throw new FlowError("This client has already finished.");
          if (fresh.status === "cancelled") return false;
          fresh.status = "cancelled";
          logEvent(fresh, member.email, "Cancelled the link");
        });
        return NextResponse.json({ ok: true });
      }
      case "retry-drive": {
        const ok = await saveLetterToDrive(id);
        if (!ok) {
          const latest = await getEngagement(id);
          const error = latest?.letters?.find((l) => l.drive?.error)?.drive?.error || latest?.signature?.drive?.error;
          throw new FlowError(error ? `Google Drive: ${error}` : "Google Drive is not connected yet.", 502);
        }
        return NextResponse.json({ ok: true });
      }
      case "resolve-flag": {
        await updateEngagement(id, (fresh) => {
          const flag = fresh.flags.find((f) => f.id === body.flagId);
          if (!flag) throw new FlowError("Flag not found.", 404);
          if (flag.resolvedAt) return false;
          flag.resolvedAt = new Date().toISOString();
          flag.resolvedBy = member.email;
          logEvent(fresh, member.email, `Marked as dealt with: ${flag.message}`);
        });
        return NextResponse.json({ ok: true });
      }
      default:
        throw new FlowError("Unknown action.");
    }
  });
}
