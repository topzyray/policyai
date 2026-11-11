import type { Classification } from "@/lib/directory";

export type CandidateChunk = {
  documentId: string;
  chunkIndex: number;
  content: string;
  title: string;
  departmentId: string;
  classification: Classification;
  score: number;
};

export type CitedExcerpt = CandidateChunk;

export type AuditEventInput = {
  retrievalRequestId: string | null;
  userSub: string;
  documentId: string | null;
  action: "retrieval" | "upload" | "document_read" | "permission_change";
  result: "allowed" | "denied" | "error";
  detail?: string | null;
};
