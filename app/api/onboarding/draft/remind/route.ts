import { NextResponse } from "next/server";
import { getDraft, markReminderSent } from "@/lib/onboarding-draft-store";
import { sendClientEmail } from "@/lib/notifications";
import { isEmail } from "@/lib/onboarding-fields";
import { appOrigin } from "@/lib/env";
import { resumeCodeEmailHtml } from "@/lib/resume-email";

/** Emails the client their resume code once, after they have entered their email. */
export async function POST(request: Request) {
  const draft = await getDraft(request.headers.get("x-resume-code") || "");
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  const email = draft.state?.email;
  if (draft.reminderSentAt || !isEmail(email)) return NextResponse.json({ ok: true, sent: false });

  await markReminderSent(draft);
  await sendClientEmail(
    String(email).trim(),
    "Your Figures resume code",
    resumeCodeEmailHtml(draft.code, `${appOrigin(request)}/onboard`, "onboarding form")
  );
  return NextResponse.json({ ok: true, sent: true });
}
