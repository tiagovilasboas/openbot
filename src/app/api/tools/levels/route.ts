import {
  handleGetLevels,
  handlePutLevel,
} from "../../../../features/tools/server/levels-handler.ts";
import { serverToolRegistry } from "../../../../features/tools/server/server-tools.ts";
import { getLocalStore } from "../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET() {
  const db = getLocalStore();
  return handleGetLevels(db, serverToolRegistry({ db }));
}

export function PUT(request: Request) {
  const db = getLocalStore();
  return handlePutLevel(request, db, serverToolRegistry({ db }));
}
