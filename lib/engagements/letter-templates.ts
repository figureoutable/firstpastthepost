import crypto from "crypto";
import { putFile, putJson, readBytes, readJson } from "@/lib/private-blob";
import { checkTemplate, type LetterKind } from "./letter-docx";

/**
 * The firm's engagement letter templates (Word files), uploaded in Settings.
 * Kept in private storage only, never in the code. Letters already issued keep their own
 * filled copy, so replacing a template never changes a letter a client has been sent.
 */

const META = "settings/letter-templates.json";
const filePath = (kind: LetterKind) => `settings/letter-templates/${kind}.docx`;

export const LETTER_KINDS: LetterKind[] = ["company", "sa", "partnership"];

export const LETTER_KIND_LABEL: Record<LetterKind, string> = {
  company: "Company",
  sa: "Self Assessment",
  partnership: "Partnership",
};

export interface TemplateInfo {
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  sha256: string;
  size: number;
}

export type TemplateMeta = Partial<Record<LetterKind, TemplateInfo>>;

export async function templateMeta(): Promise<TemplateMeta> {
  return (await readJson<TemplateMeta>(META)) || {};
}

export async function readTemplate(kind: LetterKind): Promise<Uint8Array | null> {
  const meta = await templateMeta();
  if (!meta[kind]) return null;
  return readBytes(filePath(kind));
}

/** Checks the Word file has every part the site fills in, then saves it. */
export async function saveTemplate(
  kind: LetterKind,
  bytes: Uint8Array,
  fileName: string,
  by: string
): Promise<{ ok: true } | { ok: false; missing: string[] }> {
  let check: Awaited<ReturnType<typeof checkTemplate>>;
  try {
    check = await checkTemplate(kind, bytes);
  } catch {
    return { ok: false, missing: ["This doesn't look like a Word (.docx) file."] };
  }
  if (!check.ok) return { ok: false, missing: check.missing };
  await putFile(filePath(kind), Buffer.from(bytes), {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    overwrite: true,
  });
  const meta = await templateMeta();
  meta[kind] = {
    fileName: fileName.slice(0, 200),
    uploadedAt: new Date().toISOString(),
    uploadedBy: by,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    size: bytes.length,
  };
  await putJson(META, meta);
  return { ok: true };
}
