import { getAuth0Client } from "@/lib/auth0";
import { verifyAuth0Jwt, type JwtVerifyOptions, type VerifiedIdentity } from "@/lib/auth/jwt";
import { AuthError } from "@/lib/http";

export type AuthIdentity = VerifiedIdentity;

export async function authenticateRequest(
  request: Request,
  jwtOptions?: JwtVerifyOptions,
): Promise<AuthIdentity> {
  const header = request.headers.get("authorization");
  if (header) {
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match?.[1]) throw new AuthError("Invalid or expired authentication");
    return verifyAuth0Jwt(match[1], jwtOptions);
  }

  const sessionUser = await readSessionIdentity();
  if (!sessionUser) throw new AuthError("Invalid or expired authentication");
  return sessionUser;
}

export async function readSessionIdentity(): Promise<AuthIdentity | null> {
  const auth0 = getAuth0Client();
  if (!auth0) return null;

  try {
    const session = await auth0.getSession();
    const user = session?.user;
    if (!user?.sub) return null;
    return {
      sub: user.sub,
      email: typeof user.email === "string" ? user.email : undefined,
      name: typeof user.name === "string" ? user.name : undefined,
    };
  } catch {
    return null;
  }
}
