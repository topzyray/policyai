export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export class AuthError extends Error {
  readonly status = 401;

  constructor(message = "Invalid or expired authentication") {
    super(message);
    this.name = "AuthError";
  }
}

export function errorResponse(error: unknown) {
  if (isFrameworkControlFlow(error)) throw error;

  if (error instanceof HttpError || error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  const name = error instanceof Error ? error.name : "Error";
  console.error(`Request failed: ${name}`);
  return Response.json({ error: "unexpected_error" }, { status: 500 });
}

function isFrameworkControlFlow(error: unknown) {
  if (!(error instanceof Error)) return false;
  const digest = "digest" in error && typeof error.digest === "string" ? error.digest : "";
  return digest.startsWith("NEXT_") || error.message.startsWith("NEXT_");
}
