import { NextResponse } from "next/server";
import { withMember } from "@/lib/admin/api";
import { addMember, getTeam, removeMember } from "@/lib/admin/team";

export async function POST(request: Request) {
  return withMember(
    async (member) => {
      const body = await request.json().catch(() => ({}));
      if (body?.action === "add") await addMember(String(body.email || ""), body.role === "admin" ? "admin" : "staff", member.email);
      else if (body?.action === "remove") await removeMember(String(body.email || ""));
      else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
      return NextResponse.json({ ok: true, team: await getTeam() });
    },
    { adminOnly: true }
  );
}
