import type { DocumentAuthorizer } from "@/lib/fga/authorizer";
import { renderAuthorizedPrompt, selectExcerpts } from "@/lib/rag/prompt";
import type { AuditEventInput, CandidateChunk, CitedExcerpt } from "@/lib/rag/types";

export type AnswerResult = {
  retrievalRequestId: string;
  answer: string;
  sources: CitedExcerpt[];
  withheldCount: number;
  modelCalled: boolean;
};

export async function answerQuestion(input: {
  userSub: string;
  question: string;
  candidates: CandidateChunk[];
  authorizer: DocumentAuthorizer;
  complete: (prompt: string) => Promise<string>;
  audit: (events: AuditEventInput[]) => Promise<void>;
  retrievalRequestId: string;
}): Promise<AnswerResult> {
  const documentIds = [...new Set(input.candidates.map((candidate) => candidate.documentId))];
  let decisions: Awaited<ReturnType<DocumentAuthorizer["canViewDocuments"]>>;

  try {
    decisions = await input.authorizer.canViewDocuments(input.userSub, documentIds);
  } catch {
    decisions = new Map(documentIds.map((id) => [id, { allowed: false, error: true }]));
  }

  const events: AuditEventInput[] = documentIds.map((documentId) => {
    const decision = decisions.get(documentId);
    return {
      retrievalRequestId: input.retrievalRequestId,
      userSub: input.userSub,
      documentId,
      action: "retrieval",
      result: decision?.error ? "error" : decision?.allowed ? "allowed" : "denied",
    };
  });
  await input.audit(events);

  const authorized = input.candidates.filter(
    (candidate) => decisions.get(candidate.documentId)?.allowed === true,
  );
  const sources = selectExcerpts(authorized);
  const withheldCount = documentIds.filter((id) => decisions.get(id)?.allowed !== true).length;

  if (sources.length === 0) {
    return {
      retrievalRequestId: input.retrievalRequestId,
      answer:
        "No authorized documents are available for this question. Matching material was withheld by the access policy, or nothing relevant was found.",
      sources: [],
      withheldCount,
      modelCalled: false,
    };
  }

  const prompt = renderAuthorizedPrompt(input.question, sources);
  const answer = await input.complete(prompt);
  return {
    retrievalRequestId: input.retrievalRequestId,
    answer,
    sources,
    withheldCount,
    modelCalled: true,
  };
}
