import { requireApiUser } from "@/lib/auth/require-user";
import { createFgaAuthorizer } from "@/lib/fga/authorizer";
import { getFgaClient } from "@/lib/fga/client";
import { errorResponse } from "@/lib/http";
import { recordAudit } from "@/lib/audit";
import { embedQuery } from "@/lib/rag/embeddings";
import { handleChat } from "@/lib/rag/handle-chat";
import { completeWithOpenAI } from "@/lib/rag/openai";
import { searchChunks } from "@/lib/rag/search";

export async function POST(request: Request) {
  try {
    await requireApiUser(request);
    const result = await handleChat(request, {
      authenticate: async (incoming) => requireApiUser(incoming),
      search: async (question, filters) => searchChunks(await embedQuery(question), filters),
      authorizer: createFgaAuthorizer(await getFgaClient()),
      complete: completeWithOpenAI,
      audit: recordAudit,
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
