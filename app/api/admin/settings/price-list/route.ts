import { NextResponse } from "next/server";
import { withMember } from "@/lib/admin/api";
import { cleanPriceList, savePriceList } from "@/lib/engagements/price-list";

export async function PUT(request: Request) {
  return withMember(
    async (member) => {
      const body = await request.json().catch(() => ({}));
      const items = cleanPriceList(body?.items);
      await savePriceList(items, member.email);
      return NextResponse.json({ ok: true, items });
    },
    { adminOnly: true }
  );
}
