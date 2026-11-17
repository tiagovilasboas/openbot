import {
  handleDeleteGrants,
  handleGetGrants,
} from "../../../../features/tools/server/grants-handler.ts";
import { getLocalStore } from "../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET() {
  return handleGetGrants(getLocalStore());
}

export function DELETE(request: Request) {
  return handleDeleteGrants(request, getLocalStore());
}
