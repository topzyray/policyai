import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, SAMPLE_DOCUMENTS, SENSITIVE_MARKERS } from "@/lib/directory";
import { answerQuestion } from "@/lib/rag/answer";
import { createFgaAuthorizer } from "@/lib/fga/authorizer";
import { directoryTuples, documentTuples, writeTuples } from "@/lib/fga/tuples";
import { DEMO_SUBJECTS } from "@/lib/directory";
import { SEED_DOCUMENTS } from "@/seed/catalog";
import { APP_DATABASE_URL, createTestFga, prepareTestDatabase } from "./stack";

function basis(index: number) {
  const values = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
  values[index] = 1;
  return values;
}

beforeAll(async () => {
  await prepareTestDatabase();
}, 120_000);

describe("cosine retrieval plus FGA", () => {
  it("returns the nearest chunk and still withholds it when FGA denies the document", async () => {
    process.env.DATABASE_URL = APP_DATABASE_URL;
    const { getDb, closePool } = await import("@/lib/db");
    const { documents, documentChunks, auditEvents } = await import("@/lib/db/schema");
    const { ensureCatalog } = await import("@/lib/documents/service");
    const { searchChunks } = await import("@/lib/rag/search");
    const db = getDb();
    await ensureCatalog();
    await db.execute(sql`TRUNCATE audit_events, document_chunks, documents RESTART IDENTITY CASCADE`);

    const salary = SEED_DOCUMENTS[0]!;
    const handbook = SEED_DOCUMENTS[1]!;
    await db.insert(documents).values([
      {
        id: salary.id,
        title: salary.title,
        originalFilename: salary.filename,
        departmentId: salary.departmentId,
        classification: salary.classification,
        ownerSub: salary.ownerSub,
        uploadedBySub: salary.ownerSub,
        contentHash: "a".repeat(64),
        bodyText: SENSITIVE_MARKERS.salary,
      },
      {
        id: handbook.id,
        title: handbook.title,
        originalFilename: handbook.filename,
        departmentId: handbook.departmentId,
        classification: handbook.classification,
        ownerSub: handbook.ownerSub,
        uploadedBySub: handbook.ownerSub,
        contentHash: "b".repeat(64),
        bodyText: SENSITIVE_MARKERS.handbook,
      },
    ]);
    await db.insert(documentChunks).values([
      {
        id: crypto.randomUUID(),
        documentId: salary.id,
        chunkIndex: 0,
        content: `Restricted pay record ${SENSITIVE_MARKERS.salary}`,
        departmentId: "hr",
        classification: "restricted",
        documentTitle: salary.title,
        embedding: basis(0),
      },
      {
        id: crypto.randomUUID(),
        documentId: handbook.id,
        chunkIndex: 0,
        content: `Leave policy ${SENSITIVE_MARKERS.handbook}`,
        departmentId: "hr",
        classification: "internal",
        documentTitle: handbook.title,
        embedding: basis(1),
      },
    ]);

    const found = await searchChunks(basis(0), { departmentId: "hr" });
    expect(found[0]?.documentId).toBe(SAMPLE_DOCUMENTS.salary);
    expect(found.map((chunk) => chunk.documentId)).toContain(SAMPLE_DOCUMENTS.handbook);

    const client = await createTestFga();
    await writeTuples(client, directoryTuples());
    await writeTuples(client, documentTuples(salary));
    await writeTuples(client, documentTuples(handbook));

    const prompts: string[] = [];
    const result = await answerQuestion({
      userSub: DEMO_SUBJECTS.hrEmployee,
      question: "What are the salary bands?",
      candidates: found,
      authorizer: createFgaAuthorizer(client),
      complete: async (prompt) => {
        prompts.push(prompt);
        return "Authorized leave guidance.";
      },
      audit: async () => undefined,
      retrievalRequestId: crypto.randomUUID(),
    });

    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain(SENSITIVE_MARKERS.handbook);
    expect(prompts[0]).not.toContain(SENSITIVE_MARKERS.salary);
    expect(result.sources.map((source) => source.documentId)).toEqual([SAMPLE_DOCUMENTS.handbook]);

    const columns = await db.execute<{ column_name: string }>(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'audit_events'
    `);
    const names = columns.rows.map((row) => row.column_name);
    expect(names).toEqual(expect.arrayContaining(["user_sub", "document_id", "result", "retrieval_request_id", "created_at"]));
    expect(names).not.toContain("content");
    expect(names).not.toContain("body_text");

    await db.delete(documents).where(eq(documents.id, salary.id));
    await closePool();
    expect(auditEvents).toBeTruthy();
  });
});
