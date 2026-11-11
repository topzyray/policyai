import { requireApiUser } from "@/lib/auth/require-user";
import { errorResponse, HttpError } from "@/lib/http";
import { assertOrganizationAdmin, changeGrant, grantSchema, listManagedTuples } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    await assertOrganizationAdmin(user.sub);
    const tuples = await listManagedTuples();
    return Response.json({ tuples });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new HttpError(400, "invalid_json");
    }
    const parsed = grantSchema.safeParse(payload);
    if (!parsed.success) throw new HttpError(400, "invalid_grant");
    await changeGrant(user.sub, parsed.data);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
