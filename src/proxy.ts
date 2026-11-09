import { NextResponse, type NextRequest } from "next/server";
import {
  clientIp,
  createRequestGuard,
} from "./features/server-guard/guard-request.ts";

// Next 16 "proxy" (the renamed middleware) runs before every /api route and
// uses the Node runtime. It can reject on headers such as Content-Length, but
// it never reads the body, so the size cap relies on the declared length.
// The limiter state lives in this module only, which is fine for the single
// `next start` process Open Bot is built for.
const guard = createRequestGuard(process.env);

export function proxy(request: NextRequest) {
  const decision = guard({
    method: request.method,
    headers: request.headers,
    ip: clientIp(request.headers),
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

export const config = { matcher: "/api/:path*" };
