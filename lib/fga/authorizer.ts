import type { OpenFgaClient } from "@openfga/sdk";
import { userRef } from "@/lib/fga/tuples";

export type AccessDecision = {
  allowed: boolean;
  error: boolean;
};

export type DocumentAuthorizer = {
  canViewDocuments(userSub: string, documentIds: string[]): Promise<Map<string, AccessDecision>>;
};

const CORRELATION_ID = /^[A-Za-z0-9-]{1,36}$/;

export function createFgaAuthorizer(client: OpenFgaClient): DocumentAuthorizer {
  return {
    async canViewDocuments(userSub, documentIds) {
      const uniqueIds = [...new Set(documentIds)];
      const decisions = new Map<string, AccessDecision>();
      for (const id of uniqueIds) {
        decisions.set(id, { allowed: false, error: true });
      }
      if (uniqueIds.length === 0) return decisions;

      for (const id of uniqueIds) {
        if (!CORRELATION_ID.test(id)) {
          throw new Error(`Document id ${id} cannot be used as an FGA correlation id`);
        }
      }

      const response = await client.batchCheck({
        checks: uniqueIds.map((documentId) => ({
          user: userRef(userSub),
          relation: "can_view",
          object: `document:${documentId}`,
          correlationId: documentId,
        })),
      });

      for (const item of response.result) {
        const documentId = item.correlationId || item.request?.object?.replace(/^document:/, "");
        if (!documentId || !decisions.has(documentId)) continue;
        if (item.error || item.allowed !== true) {
          decisions.set(documentId, { allowed: false, error: Boolean(item.error) });
          continue;
        }
        decisions.set(documentId, { allowed: true, error: false });
      }

      return decisions;
    },
  };
}
