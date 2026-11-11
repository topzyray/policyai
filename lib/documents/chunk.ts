import { CHUNK_OVERLAP, CHUNK_SIZE } from "@/lib/directory";

export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (overlap < 0 || size <= 0 || overlap >= size) {
    throw new Error("Chunk overlap must be smaller than the chunk size");
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(normalized.length, start + size);
    if (end < normalized.length) {
      const paragraph = normalized.lastIndexOf("\n\n", end);
      const space = normalized.lastIndexOf(" ", end);
      if (paragraph > start + size * 0.5) end = paragraph;
      else if (space > start + size * 0.5) end = space;
    }

    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= normalized.length) break;

    const next = end - overlap;
    start = next > start ? next : end;
  }

  return chunks;
}
