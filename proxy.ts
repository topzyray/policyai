import { NextResponse, type NextRequest } from "next/server";
import { getAuth0Client } from "@/lib/auth0";

const PUBLIC_PATHS = new Set(["/", "/api/health"]);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const auth0 = getAuth0Client();

  if (!auth0) {
    if (PUBLIC_PATHS.has(path)) return NextResponse.next();
    if (path.startsWith("/api/")) {
      if (request.headers.get("authorization")?.toLowerCase().startsWith("bearer ")) {
        return NextResponse.next();
      }
      return NextResponse.json({ error: "Invalid or expired authentication" }, { status: 401 });
    }
    const home = new URL("/", request.url);
    home.searchParams.set("auth", "unconfigured");
    return NextResponse.redirect(home);
  }

  const authResponse = await auth0.middleware(request);
  if (path.startsWith("/auth")) return authResponse;
  if (PUBLIC_PATHS.has(path)) return authResponse;

  if (path.startsWith("/api/") && request.headers.get("authorization")?.toLowerCase().startsWith("bearer ")) {
    return authResponse;
  }

  const session = await auth0.getSession(request);
  if (!session) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid or expired authentication" }, { status: 401 });
    }
    const login = new URL("/auth/login", request.url);
    login.searchParams.set("returnTo", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  return authResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
