import { withMember } from "@/lib/admin/api";
import { FlowError, letterFileName, readSignedPdf } from "@/lib/engagements/actions";
import { getEngagement } from "@/lib/engagements/store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withMember(async () => {
    const { id } = await params;
    const e = await getEngagement(id);
    const pdf = e ? await readSignedPdf(e) : null;
    if (!e?.signature || !pdf) throw new FlowError("Signed letter not found.", 404);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${letterFileName(e, e.signature.signedAt).replace(/"/g, "")}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
