import { NextResponse } from "next/server";
import { withMember } from "@/lib/admin/api";
import { saveSettings } from "@/lib/engagements/settings";

export async function PUT(request: Request) {
  return withMember(
    async (member) => {
      const body = await request.json().catch(() => ({}));
      const settings = await saveSettings(
        {
          autoStartAml: typeof body?.autoStartAml === "boolean" ? body.autoStartAml : undefined,
          dailySummary: typeof body?.dailySummary === "boolean" ? body.dailySummary : undefined,
        },
        member.email
      );
      return NextResponse.json({ ok: true, settings });
    },
    { adminOnly: true }
  );
}
