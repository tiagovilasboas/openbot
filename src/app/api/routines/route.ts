import { listBots } from "../../../features/bots/server/bots-repository.ts";
import {
  handleDeleteRoutine,
  handleListRoutines,
  handleSaveRoutine,
} from "../../../features/routines/server/routines-handler.ts";
import { getLocalStore } from "../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleListRoutines(request, getLocalStore());
}

export function PUT(request: Request) {
  const db = getLocalStore();
  return handleSaveRoutine(request, db, (botId) =>
    listBots(db).some((bot) => bot.id === botId),
  );
}

export function DELETE(request: Request) {
  return handleDeleteRoutine(request, getLocalStore());
}
