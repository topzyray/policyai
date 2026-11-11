import { z } from "zod";
import { CLASSIFICATIONS, DEPARTMENTS } from "@/lib/directory";
import { authenticateRequest } from "@/lib/auth/identity";
import type { JwtVerifyOptions } from "@/lib/auth/jwt";
import type { DocumentAuthorizer } from "@/lib/fga/authorizer";
import { HttpError } from "@/lib/http";
import { answerQuestion } from "@/lib/rag/answer";
import { parseSearchFilters } from "@/lib/rag/search";
import type { AuditEventInput, CandidateChunk } from "@/lib/rag/types";

const departmentIds = DEPARTMENTS.map((department) => department.id) as [string, ...string[]];

export const chatRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  departmentId: z.enum(departmentIds).optional(),
  classification: z.enum(CLASSIFICATIONS).optional(),
});

export type ChatDependencies = {
  authenticate: (request: Request, jwtOptions?: JwtVerifyOptions) => Promise<{ sub: string }>;
  search: (question: string, filters: { departmentId?: string; classification?: string }) => Promise<CandidateChunk[]>;
  authorizer: DocumentAuthorizer;
  complete: (prompt: string) => Promise<string>;
  audit: (events: AuditEventInput[]) => Promise<void>;
  jwtOptions?: JwtVerifyOptions;
};

export async function handleChat(request: Request, deps: ChatDependencies) {
  const user = await deps.authenticate(request, deps.jwtOptions);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new HttpError(400, "invalid_json");
  }

  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, "invalid_question");

  const filters = parseSearchFilters(parsed.data);
  const candidates = await deps.search(parsed.data.question, filters);
  return answerQuestion({
    userSub: user.sub,
    question: parsed.data.question,
    candidates,
    authorizer: deps.authorizer,
    complete: deps.complete,
    audit: deps.audit,
    retrievalRequestId: crypto.randomUUID(),
  });
}

export function productionAuthenticate(request: Request) {
  return authenticateRequest(request);
}
