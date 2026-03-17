import { NextResponse } from "next/server";
import { sendInternalEmail } from "@/lib/notifications";

/** Step 1: CIC or limited by guarantee — team follow-up */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    await sendInternalEmail(
      "Incorporation: CIC or limited by guarantee — contact client",
      `<p>Client needs custom structure. Details:</p><pre>${JSON.stringify(body, null, 2)}</pre>`
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Notify failed" }, { status: 500 });
  }
}
