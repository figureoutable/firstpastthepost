import { NextResponse } from "next/server";
import { signLetter } from "@/lib/engagements/actions";
import { withEngagement } from "@/lib/engagements/client-api";

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return withEngagement(params, async (e) => {
    const body = await request.json().catch(() => ({}));
    await signLetter(
      e,
      {
        kind: typeof body?.kind === "string" ? body.kind : undefined,
        name: body?.name,
        agree: body?.agree === true,
        startNow: body?.startNow === true,
        fingerprint: String(body?.fingerprint || ""),
      },
      request
    );
    return NextResponse.json({ ok: true });
  });
}
