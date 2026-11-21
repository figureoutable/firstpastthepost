import { NextResponse } from "next/server";
import { sendInternalEmail } from "@/lib/notifications";
import { appendSpecialIncorporationLead } from "@/lib/google-sheets";
import { escapeHtml } from "@/lib/email-html";
import { isEmail } from "@/lib/onboarding-fields";

/** Step 1: CIC or limited by guarantee. The team contacts the client directly. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!String(body.name || "").trim() || !isEmail(body.email)) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }
    await appendSpecialIncorporationLead(body);
    const row = (label: string, value: unknown) =>
      `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">${label}</td><td style="padding:4px 0;">${escapeHtml(value) || "-"}</td></tr>`;
    await sendInternalEmail(
      "Company formation: CIC or limited by guarantee, contact client",
      `<div style="font-family:sans-serif;max-width:600px;">
        <p>A client needs a CIC or company limited by guarantee. Please get in touch.</p>
        <table style="font-size:14px;border-collapse:collapse;">
          ${row("Name", body.name)}
          ${row("Email", body.email)}
          ${row("Phone", body.phone)}
          ${row("Community interest company", body.cic)}
          ${row("Limited by guarantee", body.limitedByGuarantee)}
        </table>
      </div>`
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Notify failed" }, { status: 500 });
  }
}
