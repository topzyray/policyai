import "./load-env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documentChunks, documents } from "@/lib/db/schema";
import { chunkText } from "@/lib/documents/chunk";
import { sha256 } from "@/lib/documents/validate";
import { ensureCatalog } from "@/lib/documents/service";
import { getFgaClient } from "@/lib/fga/client";
import { syncDocumentAuthorization } from "@/lib/fga/tuples";
import { embedTexts } from "@/lib/rag/embeddings";
import { SEED_DOCUMENTS } from "@/seed/catalog";

async function main() {
  await ensureCatalog();
  const db = getDb();
  const client = await getFgaClient();

  for (const document of SEED_DOCUMENTS) {
    const bytes = new Uint8Array(await readFile(path.join(process.cwd(), "seed", "documents", document.filename)));
    const bodyText = new TextDecoder().decode(bytes).trim();
    const parts = chunkText(bodyText);
    const embeddings = await embedTexts(parts);

    await db.delete(documents).where(eq(documents.id, document.id));
    await db.insert(documents).values({
      id: document.id,
      title: document.title,
      originalFilename: document.filename,
      departmentId: document.departmentId,
      classification: document.classification,
      ownerSub: document.ownerSub,
      uploadedBySub: document.ownerSub,
      contentHash: sha256(bytes),
      bodyText,
    });
    await db.insert(documentChunks).values(
      parts.map((content, chunkIndex) => ({
        id: crypto.randomUUID(),
        documentId: document.id,
        chunkIndex,
        content,
        departmentId: document.departmentId,
        classification: document.classification,
        documentTitle: document.title,
        embedding: embeddings[chunkIndex]!,
      })),
    );
    await syncDocumentAuthorization(client, document);
    console.log(`Seeded ${document.title} (${parts.length} chunks)`);
  }

  console.log("Sample documents are stored and authorized in FGA.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
