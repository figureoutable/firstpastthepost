import { NextResponse } from "next/server";
import { withMember } from "@/lib/admin/api";
import { FlowError } from "@/lib/engagements/actions";
import { LETTER_KINDS, readTemplate, saveTemplate, templateMeta } from "@/lib/engagements/letter-templates";
import type { LetterKind } from "@/lib/engagements/letter-docx";

const MAX_BYTES = 5 * 1024 * 1024;

function kindOf(value: unknown): LetterKind {
  if (!LETTER_KINDS.includes(value as LetterKind)) throw new FlowError("Choose which letter this is.");
  return value as LetterKind;
}

/** Uploads one of the three Word templates. Admins only. */
export async function POST(request: Request) {
  return withMember(
    async (member) => {
      const form = await request.formData().catch(() => null);
      const kind = kindOf(form?.get("kind"));
      const file = form?.get("file");
      if (!(file instanceof File)) throw new FlowError("Choose the Word file.");
      if (!file.name.toLowerCase().endsWith(".docx")) throw new FlowError("Upload the letter as a Word file (.docx).");
      if (file.size > MAX_BYTES) throw new FlowError("That file is over 5 MB. Is it the right one?");
      const result = await saveTemplate(kind, new Uint8Array(await file.arrayBuffer()), file.name, member.email);
      if (!result.ok) {
        throw new FlowError(`This file is missing parts the site fills in: ${result.missing.join("; ")}. Check it's the right template.`, 422);
      }
      return NextResponse.json({ ok: true, meta: await templateMeta() });
    },
    { adminOnly: true }
  );
}

/** Downloads the current template, to check which one is in use. */
export async function GET(request: Request) {
  return withMember(
    async () => {
      const kind = kindOf(new URL(request.url).searchParams.get("kind"));
      const meta = (await templateMeta())[kind];
      const bytes = await readTemplate(kind);
      if (!meta || !bytes) throw new FlowError("No template uploaded yet.", 404);
      return new Response(new Uint8Array(bytes), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${meta.fileName.replace(/["\\]/g, "")}"`,
          "Cache-Control": "private, no-store",
        },
      });
    },
    { adminOnly: true }
  );
}
