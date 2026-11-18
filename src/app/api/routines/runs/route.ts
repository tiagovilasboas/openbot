import { handleListRuns } from "../../../../features/routines/server/routines-handler.ts";
import { getLocalStore } from "../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleListRuns(request, getLocalStore());
}
