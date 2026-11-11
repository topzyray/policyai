import { and, cosineDistance, eq, sql } from "drizzle-orm";
import { SEARCH_CANDIDATE_LIMIT, isClassification, isDepartmentId } from "@/lib/directory";
import { getDb } from "@/lib/db";
import { documentChunks } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import { assertEmbedding } from "@/lib/rag/embeddings";
import type { CandidateChunk } from "@/lib/rag/types";

export type SearchFilters = {
  departmentId?: string;
  classification?: string;
};

export function parseSearchFilters(input: { departmentId?: string; classification?: string }): SearchFilters {
  if (input.departmentId && !isDepartmentId(input.departmentId)) {
    throw new HttpError(400, "unknown_department");
  }
  if (input.classification && !isClassification(input.classification)) {
    throw new HttpError(400, "invalid_classification");
  }
  return {
    departmentId: input.departmentId,
    classification: input.classification,
  };
}

export async function searchChunks(embedding: number[], filters: SearchFilters = {}) {
  assertEmbedding(embedding);
  const distance = cosineDistance(documentChunks.embedding, embedding);
  const conditions = [];
  if (filters.departmentId) conditions.push(eq(documentChunks.departmentId, filters.departmentId));
  if (filters.classification) conditions.push(eq(documentChunks.classification, filters.classification));

  const rows = await getDb()
    .select({
      documentId: documentChunks.documentId,
      chunkIndex: documentChunks.chunkIndex,
      content: documentChunks.content,
      title: documentChunks.documentTitle,
      departmentId: documentChunks.departmentId,
      classification: documentChunks.classification,
      score: sql<number>`1 - (${distance})`,
    })
    .from(documentChunks)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(distance)
    .limit(SEARCH_CANDIDATE_LIMIT);

  return rows.map((row) => ({
    documentId: row.documentId,
    chunkIndex: row.chunkIndex,
    content: row.content,
    title: row.title,
    departmentId: row.departmentId,
    classification: row.classification as CandidateChunk["classification"],
    score: Number(row.score),
  }));
}
