import http from "node:http";
import https from "node:https";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Fetch implementation that stays on HTTP/1.1.
 * Node's global fetch negotiates HTTP/2 with this Auth0 tenant and the
 * discovery response never arrives, so login times out.
 */
export const http1Fetch: typeof fetch = async (input, init) => {
  return request(new Request(input, init), 0);
};

async function request(requestInit: Request, redirects: number): Promise<Response> {
  const url = new URL(requestInit.url);
  const body = requestInit.body ? Buffer.from(await requestInit.arrayBuffer()) : undefined;
  const headers: Record<string, string | string[]> = {};
  requestInit.headers.forEach((value, key) => {
    if (key === "content-length" || key === "host") return;
    headers[key] = value;
  });

  const transport = url.protocol === "http:" ? http : https;
  const incoming = await new Promise<http.IncomingMessage>((resolve, reject) => {
    const outbound = transport.request(
      url,
      {
        method: requestInit.method,
        headers,
        family: 4,
      },
      resolve,
    );

    const abort = () => {
      outbound.destroy();
      reject(requestInit.signal.reason ?? new DOMException("The operation was aborted.", "AbortError"));
    };
    if (requestInit.signal.aborted) {
      abort();
      return;
    }
    requestInit.signal.addEventListener("abort", abort, { once: true });
    outbound.on("error", (error) => {
      requestInit.signal.removeEventListener("abort", abort);
      if (requestInit.signal.aborted) {
        reject(requestInit.signal.reason ?? error);
        return;
      }
      reject(error);
    });
    outbound.on("close", () => requestInit.signal.removeEventListener("abort", abort));
    outbound.end(body);
  });

  const chunks: Buffer[] = [];
  for await (const chunk of incoming) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const responseHeaders = new Headers();
  for (const [key, value] of Object.entries(incoming.headers)) {
    if (value == null) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      responseHeaders.append(key, item);
    }
  }

  const status = incoming.statusCode ?? 500;
  const redirect = requestInit.redirect;
  if (REDIRECT_STATUSES.has(status) && redirect !== "manual" && redirect !== "error") {
    const location = responseHeaders.get("location");
    if (!location || redirects >= 5) throw new TypeError("Auth0 redirect could not be followed");
    const nextUrl = new URL(location, url);
    const method = status === 303 || ((status === 301 || status === 302) && requestInit.method === "POST") ? "GET" : requestInit.method;
    const nextHeaders = new Headers(requestInit.headers);
    if (method === "GET") nextHeaders.delete("content-type");
    return request(new Request(nextUrl, { method, headers: nextHeaders, redirect, signal: requestInit.signal }), redirects + 1);
  }
  if (redirect === "error" && REDIRECT_STATUSES.has(status)) {
    throw new TypeError("Auth0 responded with a redirect");
  }

  return new Response(Buffer.concat(chunks), {
    status,
    statusText: incoming.statusMessage,
    headers: responseHeaders,
  });
}
