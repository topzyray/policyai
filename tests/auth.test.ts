import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { authenticateRequest } from "@/lib/auth/identity";
import { verifyAuth0Jwt } from "@/lib/auth/jwt";
import { AuthError } from "@/lib/http";
import { handleChat } from "@/lib/rag/handle-chat";
import { DEMO_SUBJECTS, SENSITIVE_MARKERS } from "@/lib/directory";

const issuer = "https://tenant.example/";
const audience = "https://policyai.example/api";
let getKey: JWTVerifyGetKey;
let privateKey: CryptoKey;
let otherKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  const other = await generateKeyPair("RS256", { extractable: true });
  otherKey = other.privateKey;
  const jwk = await exportJWK(pair.publicKey);
  jwk.alg = "RS256";
  jwk.kid = "test-key";
  getKey = createLocalJWKSet({ keys: [jwk] });
});

async function sign(subject: string | null, options?: { expiresIn?: string; audience?: string; key?: CryptoKey }) {
  const builder = new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(issuer)
    .setAudience(options?.audience ?? audience)
    .setIssuedAt()
    .setExpirationTime(options?.expiresIn ?? "5m");
  if (subject) builder.setSubject(subject);
  return builder.sign(options?.key ?? privateKey);
}

describe("authentication", () => {
  it("rejects a missing, malformed, expired, or wrongly signed token", async () => {
    const options = { getKey, issuer, audience };
    await expect(verifyAuth0Jwt("not-a-jwt", options)).rejects.toBeInstanceOf(AuthError);
    await expect(verifyAuth0Jwt(await sign(DEMO_SUBJECTS.hrEmployee, { expiresIn: "-1m" }), options)).rejects.toBeInstanceOf(AuthError);
    await expect(
      verifyAuth0Jwt(await sign(DEMO_SUBJECTS.hrEmployee, { key: otherKey }), options),
    ).rejects.toBeInstanceOf(AuthError);
    await expect(
      verifyAuth0Jwt(await sign(DEMO_SUBJECTS.hrEmployee, { audience: "https://other.example" }), options),
    ).rejects.toBeInstanceOf(AuthError);
    await expect(verifyAuth0Jwt(await sign(null), options)).rejects.toBeInstanceOf(AuthError);

    const missing = await import("@/app/api/chat/route");
    const response = await missing.POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: "What are the salary bands?" }),
      }),
    );
    expect(response.status).toBe(401);

    const malformed = await missing.POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          authorization: "Bearer not-a-jwt",
          "content-type": "application/json",
        },
        body: JSON.stringify({ question: "What are the salary bands?", userId: DEMO_SUBJECTS.hrManager }),
      }),
    );
    expect(malformed.status).toBe(401);
  });

  it("uses the validated token subject and ignores a client-provided user id", async () => {
    const token = await sign(DEMO_SUBJECTS.hrEmployee);
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        question: "What are the salary bands?",
        userId: DEMO_SUBJECTS.hrManager,
      }),
    });

    const identity = await authenticateRequest(request.clone(), { getKey, issuer, audience });
    expect(identity.sub).toBe(DEMO_SUBJECTS.hrEmployee);

    let checkedSubject = "";
    const result = await handleChat(request, {
      authenticate: (incoming) => authenticateRequest(incoming, { getKey, issuer, audience }),
      search: async () => [
        {
          documentId: "11111111-1111-4111-8111-111111111111",
          chunkIndex: 0,
          content: SENSITIVE_MARKERS.salary,
          title: "FY26 Salary Bands",
          departmentId: "hr",
          classification: "restricted",
          score: 0.9,
        },
      ],
      authorizer: {
        async canViewDocuments(userSub) {
          checkedSubject = userSub;
          return new Map([["11111111-1111-4111-8111-111111111111", { allowed: false, error: false }]]);
        },
      },
      complete: async () => {
        throw new Error("The model must not be called for a denied document");
      },
      audit: async () => undefined,
    });

    expect(checkedSubject).toBe(DEMO_SUBJECTS.hrEmployee);
    expect(checkedSubject).not.toBe(DEMO_SUBJECTS.hrManager);
    expect(result.modelCalled).toBe(false);
    expect(result.answer).not.toContain(SENSITIVE_MARKERS.salary);
  });
});
