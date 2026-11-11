import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";
import { AuthError } from "@/lib/http";

export type VerifiedIdentity = {
  sub: string;
  email?: string;
  name?: string;
};

export type JwtVerifyOptions = {
  getKey?: JWTVerifyGetKey;
  issuer?: string;
  audience?: string;
  domain?: string;
};

const jwksCache = new Map<string, JWTVerifyGetKey>();

function remoteKey(domain: string) {
  const cached = jwksCache.get(domain);
  if (cached) return cached;
  const key = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  jwksCache.set(domain, key);
  return key;
}

export async function verifyAuth0Jwt(token: string, options: JwtVerifyOptions = {}): Promise<VerifiedIdentity> {
  const domain = options.domain ?? process.env.AUTH0_DOMAIN;
  const audience = options.audience ?? process.env.AUTH0_AUDIENCE;
  const issuer = options.issuer ?? (domain ? `https://${domain}/` : undefined);

  if (!issuer || !audience || (!options.getKey && !domain)) {
    throw new AuthError("Invalid or expired authentication");
  }

  let payload: JWTPayload;
  try {
    const verified = await jwtVerify(token, options.getKey ?? remoteKey(domain!), {
      issuer,
      audience,
      algorithms: ["RS256"],
    });
    payload = verified.payload;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Invalid or expired authentication");
  }

  if (!payload.sub) {
    throw new AuthError("Invalid or expired authentication");
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}
