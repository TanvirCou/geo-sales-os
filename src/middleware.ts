import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "bsm_session";
const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  // Clean duplicate proxy headers (caused by Cloudflare / OpenLiteSpeed)
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  if (forwardedHost && forwardedHost.includes(",")) {
    requestHeaders.set("x-forwarded-host", forwardedHost.split(",")[0].trim());
  }

  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  if (forwardedProto && forwardedProto.includes(",")) {
    requestHeaders.set("x-forwarded-proto", forwardedProto.split(",")[0].trim());
  }

  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Check session cookie for protected routes
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    const host = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "geosales.colorhutbd.xyz").split(",")[0].trim();
    const proto = (requestHeaders.get("x-forwarded-proto") || "https").split(",")[0].trim();

    const loginUrl = new URL("/login", `${proto}://${host}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
