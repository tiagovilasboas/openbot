import { listBots } from "../../../../features/bots/server/bots-repository.ts";
import {
  handleDeleteChannel,
  handleListChannels,
  handleSaveChannel,
} from "../../../../features/crew/channel/server/channels-handler.ts";
import { getLocalStore } from "../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET() {
  return handleListChannels(getLocalStore());
}

export function PUT(request: Request) {
  const db = getLocalStore();
  return handleSaveChannel(request, db, () => listBots(db).map((b) => b.id));
}

export function DELETE(request: Request) {
  return handleDeleteChannel(request, getLocalStore());
}
