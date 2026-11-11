import { createHash } from "node:crypto";
import { MAX_UPLOAD_BYTES, type Classification } from "@/lib/directory";
import { HttpError } from "@/lib/http";

const EXTENSIONS: Record<string, "pdf" | "txt" | "md"> = {
  pdf: "pdf",
  txt: "txt",
  md: "md",
  markdown: "md",
};

export type UploadKind = "pdf" | "txt" | "md";

export function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function validateUpload(file: { name: string; bytes: Uint8Array }) {
  if (file.bytes.byteLength === 0) throw new HttpError(400, "empty_file");
  if (file.bytes.byteLength > MAX_UPLOAD_BYTES) throw new HttpError(400, "file_too_large");

  const base = file.name.split(/[/\\]/).pop()?.trim() ?? "";
  const extension = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  const kind = EXTENSIONS[extension];
  if (!kind) throw new HttpError(400, "unsupported_file_type");

  if (kind === "pdf") {
    const header = new TextDecoder().decode(file.bytes.subarray(0, 5));
    if (!header.startsWith("%PDF-")) throw new HttpError(400, "invalid_pdf");
  } else if (file.bytes.includes(0)) {
    throw new HttpError(400, "binary_text_rejected");
  }

  const filename = base.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180);
  return { kind, filename };
}

export function assertClassification(value: string): Classification {
  if (value !== "public" && value !== "internal" && value !== "restricted") {
    throw new HttpError(400, "invalid_classification");
  }
  return value;
}
