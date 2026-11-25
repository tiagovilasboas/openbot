import {
  handleListMessages,
  handlePostMessage,
} from "../../../../../features/crew/channel/server/channel-messages-handler.ts";
import { createChannelPostDeps } from "../../../../../features/crew/channel/server/channel-post-deps.ts";
import { getLocalStore } from "../../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleListMessages(request, getLocalStore());
}

export function POST(request: Request) {
  const db = getLocalStore();
  return handlePostMessage(request, db, createChannelPostDeps(db));
}
