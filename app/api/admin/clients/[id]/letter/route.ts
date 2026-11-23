import { withMember } from "@/lib/admin/api";
import { FlowError, letterFileName, readSignedPdf, signedLetterName } from "@/lib/engagements/actions";
import { readLetterPdf } from "@/lib/engagements/letters";
import { readBytes } from "@/lib/private-blob";
import { getEngagement } from "@/lib/engagements/store";

const safe = (name: string) => name.replace(/["\\]/g, "");

/**
 * A client's letter. ?kind=company|sa|partnership for the firm's letters, with
 * &version=signed (default when signed), issued (the PDF the client read) or docx (the filled Word file).
 * With no kind, the older built-in letter's signed PDF.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withMember(async () => {
    const { id } = await params;
    const e = await getEngagement(id);
    if (!e) throw new FlowError("Client not found.", 404);
    const query = new URL(request.url).searchParams;
    const kind = query.get("kind");

    if (kind) {
      const letter = e.letters?.find((l) => l.kind === kind);
      if (!letter) throw new FlowError("Letter not found.", 404);
      const version = query.get("version") || (letter.signature ? "signed" : "issued");
      if (version === "docx") {
        const docx = await readBytes(letter.docxPath);
        if (!docx) throw new FlowError("Letter not found.", 404);
        return new Response(new Uint8Array(docx), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${safe(`Engagement letter - ${letter.party}`)}.docx"`,
            "Cache-Control": "private, no-store",
          },
        });
      }
      const signed = version === "signed" && Boolean(letter.signature);
      const pdf = await readLetterPdf(letter, signed);
      if (!pdf) throw new FlowError("Letter not found.", 404);
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${safe(signed ? signedLetterName(letter) : `Engagement letter - ${letter.party}`)}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const pdf = await readSignedPdf(e);
    if (!e.signature || !pdf) throw new FlowError("Signed letter not found.", 404);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safe(letterFileName(e, e.signature.signedAt))}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
