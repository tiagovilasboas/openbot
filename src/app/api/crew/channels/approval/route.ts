import { handleResolveApproval } from "../../../../../features/crew/channel/server/channel-approval-handler.ts";
import { createChannelPostDeps } from "../../../../../features/crew/channel/server/channel-post-deps.ts";
import { getLocalStore } from "../../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  const db = getLocalStore();
  return handleResolveApproval(request, db, createChannelPostDeps(db));
}
