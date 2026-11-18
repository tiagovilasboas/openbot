import { createModelRoutineRunner } from "../../../../features/routines/server/model-routine-runner.ts";
import { handleRunNow } from "../../../../features/routines/server/routines-handler.ts";
import { getLocalStore } from "../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  const db = getLocalStore();
  return handleRunNow(request, db, createModelRoutineRunner(db));
}
