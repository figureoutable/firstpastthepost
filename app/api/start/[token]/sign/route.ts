import { NextResponse } from "next/server";
import { signLetter } from "@/lib/engagements/actions";
import { withEngagement } from "@/lib/engagements/client-api";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return withEngagement(params, async (e) => {
    const body = await request.json().catch(() => ({}));
    await signLetter(e, { name: body?.name, agree: body?.agree === true, fingerprint: String(body?.fingerprint || "") }, request);
    return NextResponse.json({ ok: true });
  });
}
