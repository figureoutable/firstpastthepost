/**
 * Shrinks large photos in the browser before upload. Phone photos are often
 * 5-10 MB, which is over the 4 MB upload limit. PDFs and formats the browser
 * cannot draw (such as HEIC outside Safari) are returned unchanged.
 */
const MAX_BYTES = 4 * 1024 * 1024;
const TARGET_BYTES = 1.5 * 1024 * 1024;
const MAX_SIDE = 2400;

export async function prepareUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= TARGET_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function isTooLarge(file: File): boolean {
  return file.size > MAX_BYTES;
}

export const ACCEPTED_UPLOADS =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export function isAcceptedUpload(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type) ||
    /\.(pdf|jpe?g|png|webp|heic|heif)$/.test(name)
  );
}
