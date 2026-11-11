import { authenticateRequest } from "@/lib/auth/identity";
import { upsertUserProfile } from "@/lib/users";
import { HttpError } from "@/lib/http";

export async function requireApiUser(request: Request) {
  const identity = await authenticateRequest(request);
  try {
    await upsertUserProfile(identity);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "profile_mapping_failed");
  }
  return identity;
}
