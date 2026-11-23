import { NextResponse } from "next/server";
import { withMember } from "@/lib/admin/api";
import { clientLink, createNewClient, type NewClientInput } from "@/lib/engagements/actions";

// Making the letters in Google Docs can take a little while.
export const maxDuration = 120;

export async function POST(request: Request) {
  return withMember(async (member) => {
    const body = (await request.json().catch(() => ({}))) as NewClientInput;
    const e = await createNewClient(body, member.email, request);
    return NextResponse.json({ id: e.id, link: clientLink(e, request), sent: Boolean(e.linkSentAt) });
  });
}
