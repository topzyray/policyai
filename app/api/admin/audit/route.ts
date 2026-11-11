import { requireApiUser } from "@/lib/auth/require-user";
import { listRecentAudit } from "@/lib/audit";
import { errorResponse } from "@/lib/http";
import { assertOrganizationAdmin } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    await assertOrganizationAdmin(user.sub);
    const events = await listRecentAudit();
    return Response.json({
      events: events.map((event) => ({
        id: event.id,
        retrievalRequestId: event.retrievalRequestId,
        userSub: event.userSub,
        documentId: event.documentId,
        action: event.action,
        result: event.result,
        detail: event.detail,
        createdAt: event.createdAt,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
