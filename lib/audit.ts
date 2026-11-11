import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import type { AuditEventInput } from "@/lib/rag/types";

const DETAIL_CODE = /^[a-z0-9_:-]{0,160}$/;

export async function recordAudit(events: AuditEventInput[]) {
  if (events.length === 0) return;

  await getDb()
    .insert(auditEvents)
    .values(
      events.map((event) => ({
        id: crypto.randomUUID(),
        retrievalRequestId: event.retrievalRequestId,
        userSub: event.userSub,
        documentId: event.documentId,
        action: event.action,
        result: event.result,
        detail: sanitizeDetail(event.detail),
      })),
    );
}

export async function listRecentAudit(limit = 40) {
  return getDb().select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(limit);
}

function sanitizeDetail(detail: string | null | undefined) {
  if (!detail) return null;
  if (!DETAIL_CODE.test(detail)) return "redacted";
  return detail;
}
