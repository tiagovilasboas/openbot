import { handleAutomationRun } from "../../../../features/automation/server/automation-handler.ts";
import { createModelRoutineRunner } from "../../../../features/routines/server/model-routine-runner.ts";
import { clientAddress } from "../../../../features/server-guard/client-address.ts";
import { getLocalStore } from "../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  const db = getLocalStore();
  return handleAutomationRun(
    request,
    db,
    clientAddress(request.headers, process.env),
    createModelRoutineRunner(db),
  );
}
