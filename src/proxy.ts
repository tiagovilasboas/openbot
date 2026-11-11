import { NextResponse, type NextRequest } from "next/server";
import { clientKey } from "./features/server-guard/client-key.ts";
import { createRequestGuard } from "./features/server-guard/guard-request.ts";
import { withPageCsp } from "./features/server-guard/page-csp.ts";

// Next 16 "proxy" (the renamed middleware) runs before every /api route and
// uses the Node runtime. It can reject on headers such as Content-Length, but
// it never reads the body, so the size cap relies on the declared length.
// The limiter state lives in this module only, which is fine for the single
// `next start` process Open Bot is built for.
const guard = createRequestGuard(process.env);

function pageResponse(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const { requestHeaders, csp } = withPageCsp(request.headers, isDev);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return pageResponse(request);
  }
  const decision = guard({
    method: request.method,
    headers: request.headers,
    ip: clientKey(request.headers, process.env),
  });
  if (decision.ok) return NextResponse.next();
  return NextResponse.json(
    { error: decision.error },
    {
      status: decision.status,
      headers:
        decision.retryAfterSeconds !== undefined
          ? { "Retry-After": String(decision.retryAfterSeconds) }
          : undefined,
    },
  );
}

// /api/* keeps the request guard; page requests get the per-request CSP.
// Static assets and prefetches are skipped: they never render HTML.
export const config = {
  matcher: [
    "/api/:path*",
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|sw.js).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
