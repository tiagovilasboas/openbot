import {
  handleTokenCreate,
  handleTokenRevoke,
  handleTokenStatus,
} from "../../../../features/automation/server/automation-handler.ts";
import { clientAddress } from "../../../../features/server-guard/client-address.ts";
import { getLocalStore } from "../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

const where = (request: Request) => clientAddress(request.headers, process.env);

export const GET = (request: Request) =>
  handleTokenStatus(getLocalStore(), where(request));
export const POST = (request: Request) =>
  handleTokenCreate(getLocalStore(), where(request));
export const DELETE = (request: Request) =>
  handleTokenRevoke(getLocalStore(), where(request));
