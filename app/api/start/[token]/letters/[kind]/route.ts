import { withEngagement } from "@/lib/engagements/client-api";
import { FlowError } from "@/lib/engagements/actions";
import { currentStep } from "@/lib/engagements/flow";
import { readLetterPdf } from "@/lib/engagements/letters";

/** The client's letter as a PDF, to read before signing (or their signed copy afterwards). */
export async function GET(request: Request, { params }: { params: Promise<{ token: string; kind: string }> }) {
  const { kind } = await params;
  return withEngagement(params, async (e) => {
    const step = currentStep(e);
    if (step === "cancelled" || step === "expired") throw new FlowError("This link is no longer active.", 410);
    const letter = e.letters?.find((l) => l.kind === kind);
    if (!letter) throw new FlowError("Letter not found.", 404);
    const pdf = await readLetterPdf(letter, Boolean(letter.signature));
    if (!pdf) throw new FlowError("Letter not found.", 404);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const name = `${letter.signature ? "Signed engagement letter" : "Engagement letter"} - ${letter.party}`.replace(/[^\w .()&-]/g, "");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  });
}
