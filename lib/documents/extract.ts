import { extractText } from "unpdf";
import type { UploadKind } from "@/lib/documents/validate";
import { HttpError } from "@/lib/http";

export async function extractDocumentText(kind: UploadKind, bytes: Uint8Array) {
  const text =
    kind === "pdf"
      ? await extractPdf(bytes)
      : new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^\uFEFF/, "");

  const normalized = text.replace(/\u0000/g, "").trim();
  if (!normalized) throw new HttpError(400, "no_extractable_text");
  return normalized;
}

async function extractPdf(bytes: Uint8Array) {
  const extracted = await extractText(bytes, { mergePages: true });
  return extracted.text;
}
