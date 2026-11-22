import { NextResponse } from "next/server";
import { consumeLoginToken, SESSION_COOKIE, sessionCookieOptions, sessionValue } from "@/lib/admin/session";
import { findMember } from "@/lib/admin/team";

/** Exchanges a sign-in link for a session. A button press does this, so email scanners can't use the link up. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = await consumeLoginToken(String(body?.token || ""));
  const member = email ? await findMember(email) : null;
  if (!member) {
    return NextResponse.json({ error: "This sign-in link has expired or was already used. Please ask for a new one." }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionValue(member.email), sessionCookieOptions);
  return res;
}
