import {
  handleTokenCreate,
  handleTokenRevoke,
  handleTokenStatus,
} from "../../../../features/automation/server/automation-handler.ts";
import { clientAddress } from "../../../../features/server-guard/client-address.ts";
import { getLocalStore } from "../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

const caller = (request: Request) => ({
  headers: request.headers,
  address: clientAddress(request.headers, process.env),
  env: process.env,
});

export const GET = (request: Request) =>
  handleTokenStatus(getLocalStore(), caller(request));
export const POST = (request: Request) =>
  handleTokenCreate(getLocalStore(), caller(request));
export const DELETE = (request: Request) =>
  handleTokenRevoke(getLocalStore(), caller(request));
