import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/env";
import { createLoginToken, isSignInConfigured } from "@/lib/admin/session";
import { findMember } from "@/lib/admin/team";
import { signInEmail } from "@/lib/engagements/emails";
import { sendClientEmail } from "@/lib/notifications";

/** Emails a one-time sign-in link to team members. Always gives the same answer, so it can't be used to test addresses. */
export async function POST(request: Request) {
  if (!isSignInConfigured()) {
    return NextResponse.json({ error: "Sign-in is not set up yet (ADMIN_SESSION_SECRET is missing in Vercel)." }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  const member = email ? await findMember(email) : null;
  if (member) {
    const token = await createLoginToken(member.email);
    const { subject, html } = signInEmail(`${appOrigin(request)}/admin/login/verify#${token}`);
    // Sign-in links go only to the person signing in.
    await sendClientEmail(member.email, subject, html, { cc: false });
  }
  return NextResponse.json({ ok: true });
}
