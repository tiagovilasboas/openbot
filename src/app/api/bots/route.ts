import {
  handleGetBots,
  handlePutBots,
} from "../../../features/bots/server/bots-handler.ts";
import { dropEndedGoalLinks } from "../../../features/routines/server/goal-links.ts";
import { forgetBotRoutines } from "../../../features/routines/server/routines-repository.ts";
import { forgetBotTools } from "../../../features/tools/server/forget-bot-tools.ts";
import { getLocalStore } from "../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET() {
  return handleGetBots(getLocalStore());
}

export function PUT(request: Request) {
  const db = getLocalStore();
  return handlePutBots(
    request,
    db,
    (removed) => {
      forgetBotTools(db, removed);
      forgetBotRoutines(db, removed);
    },
    (bots) => dropEndedGoalLinks(db, bots),
  );
}
